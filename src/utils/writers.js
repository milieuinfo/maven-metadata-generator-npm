import  { json2csv }  from 'json-2-csv';
import {convertCsvToXlsx} from '@aternus/csv-to-xlsx';
import jp from "jsonpath";
import {parquetSourcesFromJsonld, parquetWriter} from './parquet_writer.js';
import {jsonld_to_table, rdf_to_jsonld} from './functions.js';



/**
 * @async
 * @function jsonld_writer
 * @param {string} data - RDF input as string
 * @param {{ file: string, frame: Frame }} jsonldOptions
 * @throws {Error} If input is invalid or extraction fails.
 * @returns {Promise<void>} A promise that resolves when the jsonld file has been written.
 */
async function jsonld_writer(data, jsonldOptions) {
    const jsonld = await rdf_to_jsonld(data, jsonldOptions.frame)
    if (!jsonld["@context"]) {
        throw new Error('Invalid input: this object is not jsonld. @context is missing.');
    }
    try {
        await fs.promises.writeFile(
            jsonldOptions.file, 
            JSON.stringify(jsonld, null, 4)
        );
    } catch (e) {
        console.error(e.toString());
    }
}

/**
 * @async
 * @function json_writer
 * @param {string} data - RDF input as string
 * @param {{ file: string, frame: Frame }} jsonOptions
 * @param {string} [jsonPath='$.graph[*]'] - Optional JSONPath expression to extract array.
 * @throws {Error} If input is invalid or extraction fails.
 * @returns {Promise<void>} A promise that resolves when the json file has been written.
 */
async function json_writer(data, jsonOptions, jsonPath='$.graph[*]') {
    const jsonld = await rdf_to_jsonld(data, jsonOptions.frame)
    if (!jsonld["@context"]) {
        throw new Error('Invalid input: this object is not jsonld. @context is missing.');
    }
    await fs.promises.writeFile(jsonOptions.file, JSON.stringify( jp.query(jsonld, jsonPath), null, 4));
}

/**
 * @async
 * @function table_writer
 * @param {string} data - RDF input as string
 * @param {{ file: string, frame: Frame }} csvOptions
 * @throws {Error} If input is invalid or extraction fails.
 * @returns {Promise<void>} A promise that resolves when the CSV file has been written.
 */
async function table_writer(data, csvOptions) {
    console.log("jsonld to csv");
    const jsonld = await rdf_to_jsonld(data, csvOptions.frame)
    if (!jsonld["@context"]) {
        throw new Error('Invalid input: this object is not jsonld. @context is missing.');
    }
    try {
        await fs.promises.writeFile(
            csvOptions.file,
            await json2csv(await jsonld_to_table(jsonld), { emptyFieldValue: null, expandArrayObjects: false }),
            'utf8'
        );
    } catch (e) {
        console.error(e.toString());
    }
}

/**
 * @function xlsx_writer
 * @param {{ file: string, sourcefile: string, sheetName: string }} excelOptions  - { file: string, sourcefile: string, sheetName: string } for excel output based on csv sourcefile
 */
function xlsx_writer(excelOptions) {
    console.log("csv to excel");
    try {
        convertCsvToXlsx(excelOptions.sourcefile, excelOptions.file, { sheetName : excelOptions.sheetName , overwrite : true });
    } catch (e) {
        console.error(e.toString());
    }
}

/**
 * Writes RDF data to a Parquet file using provided options.
 * Converts the RDF dataset to JSON-LD with a given frame, then serializes the result to Parquet format.
 *
 * @async
 * @function parquet_writer
 * @param {Dataset} data - The RDF dataset to serialize.
 * @param {Object} parquetOptions - Options for Parquet serialization.
 * @param {string} parquetOptions.file - Path to the Parquet output file.
 * @param {Object} parquetOptions.frame - JSON-LD frame to apply for shaping the data.
 * @throws {Error} If no output file is specified in parquetOptions.
 * @throws {TypeError} If the frame is invalid or missing a @context property.
 * @returns {Promise<void>} A promise that resolves when the Parquet file has been written.
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

export { json_writer, jsonld_writer, table_writer, xlsx_writer, parquet_writer };