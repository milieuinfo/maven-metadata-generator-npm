'use strict';

import N3 from 'n3';
import fs from "fs";
import rdfDataset from "@rdfjs/dataset";
import validate from './utils/shacl_validation.js';
import {parquetSourcesFromJsonld, parquetWriter} from './utils/parquet_writer.js';
import jsonld from "jsonld";
import path from "path";
import  { json2csv }  from 'json-2-csv';
import {convertCsvToXlsx} from '@aternus/csv-to-xlsx';
import {RoxiReasoner} from "roxi-js";
import csv from 'csvtojson';
import jp from "jsonpath";
import {construct_dcat} from './utils/metadata.js';
import {xsd_writer} from './utils/xsd.js';
import {separateString, sortLines, jsonld_to_table, to_be_metadated} from './utils/functions.js';
import {deploy_latest} from './utils/deploy.js';
import rdf from "@zazuko/env-node";


/**
 * @typedef {Object} OutputOptions
 * @property {string} turtlePath - Output path for Turtle serialization
 * @property {{ file: string, frame: any }} jsonOptions - { file: string, frame: object } for JSON output
 * @property {{ file: string, frame: any }} jsonldOptions  - { file: string, frame: object } for JSON-LD output
 * @property {{ file: string, sourcefile: string, sheetName: string }} excelOptions  - { file: string, sourcefile: string, sheetName: string } for excel output based on csv sourcefile
 * @property {string} ntriplesPath - Output path for N-Triples serialization
 * @property {string} xsdPath  - Output path for XSD serialization
 * @property {{ file: string, frame: any }} csvOptions - { file: string, frame: object } for CSV output
 * @property {{ file: string, frame: any }} parquetOptions - { file: string, frame: object } for Parquet output
 */

/**
 * @typedef {Object} SkosSource
 * @property {Dataset} shapesDataset - SHACL shapes for validating the RDF
 * @property {Object} contextPrefixes - @context with prefixes included
 * @property {Array<string>} rules  -  Array of Paths of Input N3 files for Notation3 reasoning
 * @Property {Object} prefixes
 */

/**
 * Generates SKOS (Simple Knowledge Organization System) files from CSV.
 * Converts CSV to JSON-LD, applies N3 reasoning, and outputs in various formats.
 * @async
 * @param {SkosSource} skosSource
 * @param {OutputOptions} options
 * @throws {Error} If options object contains no specified output.
 * @throws {TypeError} If OutputOptions is not an object.
 */
async function generate_skos(options, skosSource ) {
    if (typeof options !== "object"){
        throw new TypeError('Expected an object');
    }
    if (![
        options.turtlePath,
        options.jsonldOptions?.file,
        options.jsonOptions?.file,
        options.csvOptions?.file,
        options.ntriplesPath,
        options.xsdPath,
        options.parquetOptions?.file
    ].some(Boolean)) {
        throw new Error('Invalid options: no specified output.');
    }
    console.log("skos generation: csv to jsonld");
    await csv({
        ignoreEmpty:true,
        flatKeys:true
    })
        .fromFile(skosSource.sourcePath)
        .then((jsonObj)=>{
            var new_json = [];
            for(var i = 0; i < jsonObj.length; i++){
                const object = {};
                Object.keys(jsonObj[i]).forEach(function(key) {
                    object[key] = separateString(jsonObj[i][key]);
                })
                new_json.push(object)
            }
            let jsonld = {"@graph": new_json, "@context": skosSource.contextPrefixes};
            console.log("1: Csv to Jsonld");
            (async () => {
                const nt_rdf = await n3_reasoning(jsonld, skosSource.rules)
                output(skosSource, nt_rdf, options)
            })()
        })
}

/**
 * Creates metadata by fetching previous versions from a remote repository,
 * processes them, and outputs version information.
 * @async
 * @returns {Promise<void>}
 */
async function create_metadata(
        metadataSource,
        metadataOptions,
        datasetOptions,
        catalogOptions) {
    console.log('metadata generation: get previous versions');
    const url = `https://repo.omgeving.vlaanderen.be/artifactory/api/search/gavc?g=${metadataOptions.groupId}&a=${metadataOptions.artifactId}&classifier=sources&repos=release`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        const body = await response.json();
        const uris = [];
        const pomRegex = /^.*pom$/;
        for (const result of body.results) {
            if (pomRegex.test(result.uri)) {
                uris.push(result.uri);
            }
        }
        await get_versions(uris, metadataSource, metadataOptions, datasetOptions, catalogOptions);
        console.log(body);
    } catch (error) {
        console.error(error.message);
    }
}

/**
 * Processes an array of URIs to extract and record version information.
 * Outputs version datasets in several formats.
 * @async
 * @param {Array<string>} uris - Array of artifact URIs to process.
 * @returns {Promise<void>}
 */
async function get_versions(uris, metadataSource, metadataOptions, datasetOptions, catalogOptions) {
    const versions = [];

    // Fetch all URIs in parallel
    const fetches = uris.map(async (url) => {
        try {
            const response = await fetch(url);
            const data = await response.json();
            const version = version_from_uri(url);
            if (!metadataOptions.startVersion || to_be_metadated(version, metadataOptions.startVersion)) {
                versions.push({ [version]: data.lastModified });
            }
        } catch (e) {
            console.error(`Failed to fetch version from ${url}: ${e.message}`);
        }
    });

    await Promise.all(fetches);

    // Add next release version
    versions.push({ [metadataOptions.next_release_version]: new Date().toISOString() });

    // Generate RDF representations
    const latest_version_nt = await n3_reasoning(construct_dcat([versions[versions.length - 1]]), metadataSource.rules);
    const all_versions_nt = await n3_reasoning(construct_dcat(versions), metadataSource.rules);




    // Clean up temp directory if it exists
    if (fs.existsSync('../temp/')) {
        fs.rmSync('../temp/', { recursive: true, force: true });
    }

    output(metadataSource, latest_version_nt, {"turtlePath": datasetOptions.turtlePath, "jsonldOptions": {"file": datasetOptions.jsonldOptions.file, "frame": datasetOptions.jsonldOptions.frame}});
    output(metadataSource, all_versions_nt, {"turtlePath": catalogOptions.turtlePath, "jsonldOptions": {"file": catalogOptions.jsonldOptions.file, "frame": catalogOptions.jsonldOptions.frame}});
}
/**
 * Applies N3 reasoning to a JSON-LD structure using provided rules.
 * Returns RDF statements in N-Triples format.
 * @async
 * @param {Object} json_ld - The JSON-LD input data.
 * @param {Array|Object} rules - The reasoning rules to apply.
 * @returns {Promise<string>} - The resulting N-Triples output.
 */
async function n3_reasoning(json_ld, rules) {
    console.log("n3 reasoning ");
    let rdf = await jsonld.toRDF(json_ld, { format: "application/n-quads" })
    const reasoner = RoxiReasoner.new();
    reasoner.add_abox(rdf);
    for (let rule in rules) {
        reasoner.add_rules(fs.readFileSync(process.cwd() + rules[rule], 'utf8'));
    }
    reasoner.materialize();
    return sortLines(reasoner.get_abox_dump());
}

// Utility to ensure a directory exists
function ensureDirSync(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Promisify N3 Writer's end method for clean async/await usage
function writerEndAsync(writer) {
    return new Promise((resolve, reject) => {
        writer.end((err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

/**
 * @typedef {Object} Source
 * @property {Dataset} shapesDataset - SHACL shapes for validating the RDF
 * @property {Object} contextPrefixes - @context with prefixes included
 * @property {Array<string>} rules  -  Array of Paths of Input N3 files for Notation3 reasoning
 * @Property {Object} prefixes
 */

/**
 * @typedef {Object} OutputOptions
 * @property {string} turtlePath
 * @property {{ file: string, frame: any }} jsonOptions
 * @property {{ file: string, frame: any }} jsonldOptions
 * @property {string} ntriplesPath
 * @property {{ file: string, frame: any }} csvOptions
 */

/**
 * @param {Source} source
 * @param {string} rdf - RDF input as string
 * @param {OutputOptions} options
 * @throws {Error} If options object contains no specified output.
 * @throws {TypeError} If OutputOptions is not an object.
 * @throws {TypeError} If source.shapesDataset is not a rdfDataset.
 * @throws {TypeError} If rdf is not a string.
 */
async function output(
    source,
    rdf,
    options
) {
    if (typeof options !== "object"){
        throw new TypeError('Expected an object');
    }
    if (source.shapesDataset.constructor.name !== "Dataset"){
        throw new TypeError('Expected a Dataset');
    }
    if (typeof rdf !== "string"){
        throw new TypeError('Expected a string');
    }
    if (![
        options.turtlePath,
        options.jsonldOptions?.file,
        options.jsonOptions?.file,
        options.csvOptions?.file,
        options.ntriplesPath,
        options.xsdPath,
        options.parquetOptions?.file
    ].some(Boolean)) {
        throw new Error('Invalid options: no specified output.');
    }
    // Initialize RDF writers and dataset
    const ttl_writer = new N3.Writer({ format: 'text/turtle', prefixes: source.prefixes});
    const nt_writer = new N3.Writer({ format: 'N-Triples' });
    const dataset = rdfDataset.dataset();
    const parser = new N3.Parser();

    // Parse the RDF string, add quads to writers and dataset
    await new Promise((resolve, reject) => {
        parser.parse(rdf, (error, quad) => {
            if (error) return reject(error);
            if (quad) {
                ttl_writer.addQuad(quad);
                nt_writer.addQuad(quad);
                dataset.add(quad);
            } else {
                resolve(); // Parsing complete
            }
        });
    });

    // Validate the dataset with provided SHACL shapes
    if (!(await validate(source.shapesDataset, dataset))) {
        console.error("Validation failed.");
        return;
    }

    try {
        // Write Turtle serialization to file, if requested
        if (options.turtlePath) {
            ensureDirSync(options.turtlePath); // Ensure directory exists
            const ttlResult = await writerEndAsync(ttl_writer); // Get Turtle as string
            await fs.promises.writeFile(options.turtlePath, ttlResult); // Write to file asynchronously
        }
        // Write N-Triples serialization, if requested
        if (options.ntriplesPath) {
            ensureDirSync(options.ntriplesPath);
            const ntResult = await writerEndAsync(nt_writer);
            await fs.promises.writeFile(options.ntriplesPath, ntResult);
        }
        // Write JSON-LD, if configured
        if (options.jsonldOptions) {
            await jsonld_writer(dataset, options.jsonldOptions.file, options.jsonldOptions.frame);
        }
        // Write CSV and optionally XLSX, if configured
        if (options.csvOptions) {
            await table_writer(dataset, options.csvOptions.file, options.csvOptions.frame);
            //TODO write excel from csv-string
            if (options.excelOptions) {
                await xlsx_writer(options.excelOptions);
            }
        }
        // Write XSD, if requested
        if (options.xsdPath) {
            await xsd_writer(dataset, options.xsdPath);
        }
        // Write Parquet, if enabled in config and CSV options present
        if (options.parquetOptions) {
            await parquet_writer(dataset, options.parquetOptions);
        }
        // Write json, if enabled in config and CSV options present
        if (options.jsonOptions) {
            await json_writer(dataset, options.jsonOptions);
        }
    } catch (err) {
        // Catch and log any errors during writing
        console.error("Output error:", err);
    }
}

async function rdf_to_jsonld(rdf_dataset, frame) {
    console.log("rdf to jsonld");
    let my_json = await jsonld.fromRDF(rdf_dataset);
    console.log("Extract ... as a tree using a frame.");
    return await jsonld.frame(my_json, frame);
}

async function jsonld_writer(data, filepath, frame) {
    await fs.promises.writeFile(filepath, JSON.stringify(await rdf_to_jsonld(data, frame), null, 4));
}

/**
 * @param {string} data - RDF input as string
 * @param {{ file: string, frame: any }} jsonOptions
 * @param {string} [jsonPath='$.graph[*]'] - Optional JSONPath expression to extract array.
 * @throws {Error} If input is invalid or extraction fails.
 */
async function json_writer(data, jsonOptions, jsonPath='$.graph[*]') {
    const jsonld = await rdf_to_jsonld(data, jsonOptions.frame)
    if (!jsonld["@context"]) {
        throw new Error('Invalid input: this object is not jsonld. @context is missing.');
    }
    await fs.promises.writeFile(jsonOptions.file, JSON.stringify( jp.query(jsonld, jsonPath), null, 4));
}

async function table_writer(data, filepath, frame) {
    console.log("jsonld to csv");
    try {
        await fs.promises.writeFile(
            filepath,
            await json2csv(await jsonld_to_table(await rdf_to_jsonld(data, frame)), { emptyFieldValue: null, expandArrayObjects: false }),
            'utf8'
        );
    } catch (e) {
        console.error(e.toString());
    }
}


async function xlsx_writer(excelOptions) {
    console.log("csv to excel");
    try {
        convertCsvToXlsx(excelOptions.sourcefile, excelOptions.file, { sheetName : excelOptions.sheetName , overwrite : true });
    } catch (e) {
        console.error(e.toString());
    }
}

/**
 * Applies N3 reasoning to a JSON-LD structure using provided rules.
 * Returns RDF statements in N-Triples format.
 * @async
 * @param {Object} json_ld - The JSON-LD input data.
 * @param {Array|Object} rules - The reasoning rules to apply.
 * @returns {Promise<string>} - The resulting N-Triples output.
 * @throws {Error} If parquetOptions object contains no specified output.
 * @throws {TypeError} If parquetOptions object contains no valid frame.
 */
async function parquet_writer(data, parquetOptions) {
    console.log("jsonld to parquet");
    if (!parquetOptions.file ) {
        throw new Error('Invalid options: no specified output.');
    }
    if (!parquetOptions.frame["@context"]) {
        throw new TypeError("Expected an objects with a @context");
    }
    const parquetSources = parquetSourcesFromJsonld(await rdf_to_jsonld(data, parquetOptions.frame))
    try {
        await parquetWriter(parquetSources, parquetOptions.file)
    } catch (e) {
        console.error(e.toString());
    }
}


function version_from_uri(uri) {
    return uri.replace(/.*-(.*).pom$/, "$1")
}

export { generate_skos, create_metadata, deploy_latest, n3_reasoning, output, jsonld_writer, json_writer };



