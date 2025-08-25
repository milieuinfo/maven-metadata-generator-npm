'use strict';

import N3 from 'n3';
import rdfDataset from "@rdfjs/dataset";
import validate from './utils/shacl_validation.js';
import csv from 'csvtojson';
import {construct_dcat} from './utils/metadata.js';
import {separateString, to_be_metadated, version_from_uri, n3_reasoning, cleanUpDir} from './utils/functions.js';
import {json_writer, jsonld_writer, table_writer, xlsx_writer, parquet_writer, xsd_writer, n3_writer } from './utils/writers.js';
import {deploy_latest} from './utils/deploy.js';


/**
 * @typedef {Object} OutputOptions
 * @property {string} turtlePath - Output path for Turtle serialization
 * @property {{ file: string, frame: Frame }} jsonOptions - { file: string, frame: JsonLdObj } for JSON output
 * @property {{ file: string, frame: Frame }} jsonldOptions  - { file: string, frame: JsonLdObj } for JSON-LD output
 * @property {{ file: string, sourcefile: string, sheetName: string }} excelOptions  - { file: string, sourcefile: string, sheetName: string } for excel output based on csv sourcefile
 * @property {string} ntriplesPath - Output path for N-Triples serialization
 * @property {{ file: string, urn: string }} xsdOptions - { file: string, urn: string } The file path where the generated XSD will be written. xsdOptions.urn - The URN to be used for XSD composition.
 * @property {{ file: string, frame: Frame }} csvOptions - { file: string, frame: JsonLdObj } for CSV output
 * @property {{ file: string, frame: Frame }} parquetOptions - { file: string, frame: JsonLdObj } for Parquet output
 */

/**
 * @typedef {Object} SkosSource
 * @property {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} shapesDataset - SHACL shapes for validating the RDF
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
        options.xsdOptions?.file,
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
 * Generates metadata for artifacts by retrieving previous versions from a remote repository,
 * processing them, and outputting version information in multiple formats.
 *
 * - Fetches artifact POM URIs based on groupId and artifactId from a remote API.
 * - Filters and processes only POM artifact URIs.
 * - For each version, retrieves version metadata and determines if it should be included based on a start version.
 * - Also includes information about the next release version.
 * - Produces RDF representations for both the latest and all versions, and triggers output in the specified formats.
 */

/**
 * @typedef {Object} MetadataOptions
 * @property {string} artifactId - pom.xml artifactId
 * @property {string} groupId - pom.xml groupId
 * @property {string} next_release_version - next release version
 * @property {string} startVersion - start metatadata from this version
 */

/**
 * @typedef {Object} MetadataSource
 * @property {Array<string>} rules  -  Array of Paths of Input N3 files for Notation3 reasoning
 * @property {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} shapesDataset - SHACL shapes for validating the RDF
 * @Property {Object} prefixes - Object wit key - value prefixes
 */

/**
 * @typedef {Object} DatasetOptions
 * @property {string} turtlePath - Output path for Turtle serialization
 * @property {{ file: string, frame: Frame }} jsonldOptions  - { file: string, frame: JsonLdObj } for JSON-LD output
 */

/**
 * @typedef {Object} CatalogOptions
 * @property {string} turtlePath - Output path for Turtle serialization
 * @property {{ file: string, frame: Frame }} jsonldOptions  - { file: string, frame: JsonLdObj } for JSON-LD output
 */

/**
 * Generates SKOS (Simple Knowledge Organization System) files from CSV.
 * Converts CSV to JSON-LD, applies N3 reasoning, and outputs in various formats.
 * @async
 * @function create_metadata
 * @param {MetadataSource} metadataSource
 * @param {MetadataOptions} metadataOptions
 * @param {DatasetOptions} datasetOptions
 * @param {CatalogOptions} catalogOptions
 * @returns {Promise<void>} Resolves when metadata generation and output are complete.
 * @throws {Error} If the remote API request fails or returns an error status.
 */
async function create_metadata(
    metadataSource,
    metadataOptions,
    datasetOptions,
    catalogOptions) {
    console.log('metadata generation: get previous versions');
    const url = `https://repo.omgeving.vlaanderen.be/artifactory/api/search/gavc?g=${metadataOptions.groupId}&a=${metadataOptions.artifactId}&classifier=sources&repos=release`;

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
}

/**
 * Processes an array of artifact URIs to extract and record version information,
 * outputting version datasets in several formats.
 *
 * For each URI, fetches JSON metadata, extracts the version number, and records
 * its last modified date if it meets the metadataOptions criteria. Adds the
 * next release version as well. Generates RDF representations of the latest and
 * all versions, applies reasoning, and writes results using output().


 /**
 * @typedef {Object} MetadataOptions
 * @property {string} artifactId - pom.xml atifactId
 * @property {string} groupId - pom.xml groupId
 * @property {string} next_release_version - next release version
 * @property {string} startVersion - start metatadata from this version
 */

/**
 * @typedef {Object} MetadataSource
 * @property {Array<string>} rules  -  Array of Paths of Input N3 files for Notation3 reasoning
 * @property {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} shapesDataset - SHACL shapes for validating the RDF
 * @Property {Object} prefixes - Object wit key - value prefixes
 */

/**
 * @typedef {Object} DatasetOptions
 * @property {string} turtlePath - Output path for Turtle serialization
 * @property {{ file: string, frame: Frame }} jsonldOptions  - { file: string, frame: JsonLdObj } for JSON-LD output
 */

/**
 * @typedef {Object} CatalogOptions
 * @property {string} turtlePath - Output path for Turtle serialization
 * @property {{ file: string, frame: Frame }} jsonldOptions  - { file: string, frame: JsonLdObj } for JSON-LD output
 */

/**
 * @async
 * @param {Array<string>} uris - Array of artifact URIs to process.
 * @param {MetadataSource} metadataSource - Source definition with SHACL shapes, prefixes, and rules for reasoning.
 * @param {MetadataOptions} metadataOptions - Metadata options, must include next_release_version, startVersion, groupId, and artifactId.
 * @param {DatasetOptions} datasetOptions - Output options for the latest version dataset (e.g., paths for Turtle and JSON-LD).
 * @param {CatalogOptions} catalogOptions  - Output options for the full catalog of versions (e.g., paths for Turtle and JSON-LD).
 * @returns {Promise<void>} Resolves when all processing and output are complete.
 * @throws {Error} If any fetch or processing step fails.
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
    cleanUpDir('../temp/')

    output(metadataSource, latest_version_nt, {"turtlePath": datasetOptions.turtlePath, "jsonldOptions": {"file": datasetOptions.jsonldOptions.file, "frame": datasetOptions.jsonldOptions.frame}});
    output(metadataSource, all_versions_nt, {"turtlePath": catalogOptions.turtlePath, "jsonldOptions": {"file": catalogOptions.jsonldOptions.file, "frame": catalogOptions.jsonldOptions.frame}});
}




/**
 * @typedef {Object} Source
 * @property {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} shapesDataset - SHACL shapes for validating the RDF
 * @property {Object} contextPrefixes - @context with prefixes included
 * @property {Array<string>} rules  -  Array of Paths of Input N3 files for Notation3 reasoning
 * @Property {Object} prefixes
 * */

/**
 * @typedef {Object} OutputOptions
 * @property {string} turtlePath
 * @property {{ file: string, frame: Frame }} jsonOptions
 * @property {{ file: string, frame: Frame }} jsonldOptions
 * @property {string} ntriplesPath
 * @property {{ file: string, frame: Frame }} csvOptions
 * */

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
        options.xsdOptions?.file,
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
    const report = await validate(source.shapesDataset, dataset)
    if (!(report.conforms)){ return}

    try {
        // Write Turtle serialization to file, if requested
        if (options.turtlePath) {
            await n3_writer(ttl_writer, options.turtlePath)
        }
        // Write N-Triples serialization, if requested
        if (options.ntriplesPath) {
            await n3_writer(nt_writer, options.ntriplesPath)
        }
        // Write JSON-LD, if configured
        if (options.jsonldOptions) {
            await jsonld_writer(dataset, options.jsonldOptions);
        }
        // Write CSV and optionally XLSX, if configured
        if (options.csvOptions) {
            await table_writer(dataset, options.csvOptions);
            //TODO write excel from csv-string
            if (options.excelOptions) {
                await xlsx_writer(options.excelOptions);
            }
        }
        // Write XSD, if requested
        if (options.xsdOptions) {
            await xsd_writer(dataset, options.xsdOptions);
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

export { generate_skos, create_metadata, deploy_latest };



