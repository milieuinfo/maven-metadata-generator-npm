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
import {
    artifactId,
    config,
    skos_context_prefixes,
    dcat_catalog_jsonld,
    dcat_catalog_turtle,
    dcat_dataset_jsonld,
    dcat_dataset_turtle,
    dcat_rules,
    frame_catalog,
    groupId,
    next_release_version,
    shapes_dcat,
    shapes_skos,
    skos_rules
} from './utils/variables.js';
import {construct_dcat} from './utils/metadata.js';
import {xsd_writer} from './utils/xsd.js';
import {separateString, sortLines, jsonld_to_table, to_be_metadated} from './utils/functions.js';
import {deploy_latest} from './utils/deploy.js';



/**
 * Generates SKOS (Simple Knowledge Organization System) files from CSV.
 * Converts CSV to JSON-LD, applies N3 reasoning, and outputs in various formats.
 * @async
 * @param {string} turtlePath - Output path for Turtle format file.
 * @param {Object} jsonldOptions - ['Output path for JSON-LD format file', 'frame'].
 * @param {string} ntriplesPath - Output path for N-Triples format file.
 * @param {Object} csvOptions - ['Output path for CSV format file.', 'frame']
 * @param {string} xsdPath - Output path for XSD format file.
 * @returns {Promise<void>}
 */

async function generate_skos(turtlePath, jsonldOptions, ntriplesPath, csvOptions, xsdPath) {
    console.log("skos generation: csv to jsonld ");
    await csv({
        ignoreEmpty:true,
        flatKeys:true
    })
        .fromFile(config.source.path + config.source.codelijst_csv)
        .then((jsonObj)=>{
            var new_json = [];
            for(var i = 0; i < jsonObj.length; i++){
                const object = {};
                Object.keys(jsonObj[i]).forEach(function(key) {
                    object[key] = separateString(jsonObj[i][key]);
                })
                new_json.push(object)
            }
            let jsonld = {"@graph": new_json, "@context": skos_context_prefixes};
            console.log("1: Csv to Jsonld");
            (async () => {
                const nt_rdf = await n3_reasoning(jsonld, skos_rules)
                output(shapes_skos, nt_rdf, turtlePath, jsonldOptions, ntriplesPath, csvOptions, xsdPath)
            })()
        })
}

/**
 * Creates metadata by fetching previous versions from a remote repository,
 * processes them, and outputs version information.
 * @async
 * @returns {Promise<void>}
 */
async function create_metadata() {
    console.log('metadata generation: get previous versions');
    const url = `https://repo.omgeving.vlaanderen.be/artifactory/api/search/gavc?g=${groupId}&a=${artifactId}&classifier=sources&repos=release`;
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
        await get_versions(uris);
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
async function get_versions(uris) {
    const versions = [];

    // Fetch all URIs in parallel
    const fetches = uris.map(async (url) => {
        try {
            const response = await fetch(url);
            const data = await response.json();
            const version = version_from_uri(url);
            if (!config.metadata.start_version || to_be_metadated(version, config.metadata.start_version)) {
                versions.push({ [version]: data.lastModified });
            }
        } catch (e) {
            console.error(`Failed to fetch version from ${url}: ${e.message}`);
        }
    });

    await Promise.all(fetches);

    // Add next release version
    versions.push({ [next_release_version]: new Date().toISOString() });

    // Generate RDF representations
    const latest_version_nt = await n3_reasoning(construct_dcat([versions[versions.length - 1]]), dcat_rules);
    const all_versions_nt = await n3_reasoning(construct_dcat(versions), dcat_rules);

    // Clean up temp directory if it exists
    if (fs.existsSync('../temp/')) {
        fs.rmSync('../temp/', { recursive: true, force: true });
    }

    output(shapes_dcat, latest_version_nt, dcat_dataset_turtle, {"file": dcat_dataset_jsonld, "frame": frame_catalog});
    output(shapes_dcat, all_versions_nt, dcat_catalog_turtle, {"file": dcat_catalog_jsonld, "frame": frame_catalog});
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


async function output({
                          shapes,
                          rdf,
                          turtlePath,
                          jsonldOptions,
                          ntriplesPath,
                          csvOptions,
                          xsdPath
                      }) {
    console.log("output");
    const ttl_writer = new N3.Writer({ format: 'text/turtle', prefixes: { ...config.skos.prefixes, ...config.prefixes } });
    const nt_writer = new N3.Writer({ format: 'N-Triples' });
    const dataset = rdfDataset.dataset();
    const parser = new N3.Parser();

    await new Promise((resolve, reject) => {
        parser.parse(rdf, (error, quad) => {
            if (error) return reject(error);
            if (quad) {
                ttl_writer.addQuad(quad);
                nt_writer.addQuad(quad);
                dataset.add(quad);
            } else {
                resolve();
            }
        });
    });

    if (!(await validate(shapes, dataset))) {
        console.error("Validation failed.");
        return;
    }

    try {
        if (turtlePath) {
            ensureDirSync(turtlePath);
            ttl_writer.end(async (err, result) => {
                if (err) return console.error(err);
                await fs.promises.writeFile(turtlePath, result);
            });
        }
        if (ntriplesPath) {
            ensureDirSync(ntriplesPath);
            nt_writer.end(async (err, result) => {
                if (err) return console.error(err);
                await fs.promises.writeFile(ntriplesPath, result);
            });
        }
        if (jsonldOptions) {
            await jsonld_writer(dataset, jsonldOptions.file, jsonldOptions.frame);
        }
        if (csvOptions) {
            await table_writer(dataset, csvOptions.file, csvOptions.frame);
            if (config.metadata.distribution.xlsx) {
                await xlsx_writer(dataset, csvOptions.file);
            }
        }
        if (xsdPath) {
            await xsd_writer(dataset, xsdPath);
        }
        if (config.metadata.distribution.parquet && csvOptions) {
            await parquet_writer(dataset, csvOptions.frame);
        }
    } catch (err) {
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
    fs.writeFileSync(filepath, JSON.stringify(await rdf_to_jsonld(data, frame), null, 4));
}

async function table_writer(data, filepath, frame) {
    console.log("jsonld to csv");
    try {
        fs.writeFileSync(filepath, await json2csv( await jsonld_to_table(  await rdf_to_jsonld(data, frame)), { emptyFieldValue: null,  expandArrayObjects: false  }), 'utf8');
    } catch (e) {
        console.error(e.toString());
    }
}

async function xlsx_writer(data, csv_filepath) {
    console.log("csv to excel");
    try {
        convertCsvToXlsx(csv_filepath, config.skos.path + config.skos.name + '/' + config.skos.name + config.skos.xlsx, { sheetName : config.types , overwrite : true });
    } catch (e) {
        console.error(e.toString());
    }
}

async function parquet_writer(data, frame) {
    console.log("jsonld to parquet");
    const parquetSources = parquetSourcesFromJsonld(await rdf_to_jsonld(data, frame))
    try {
        await parquetWriter(parquetSources, config.skos.path + config.skos.name + '/' + config.skos.name + config.skos.parquet)
    } catch (e) {
        console.error(e.toString());
    }
}


function version_from_uri(uri) {
    return uri.replace(/.*-(.*).pom$/, "$1")
}

export { generate_skos, create_metadata, deploy_latest, n3_reasoning, output, jsonld_writer };



