import  { json2csv }  from 'json-2-csv';
import {convertCsvToXlsx} from '@aternus/csv-to-xlsx';
import jp from "jsonpath";
import {parquetSourcesFromJsonld, parquetWriter} from './parquet_writer.js';
import {jsonld_to_table, rdf_to_jsonld, ensureDirSync} from './functions.js';
import fs from "fs";
import {xsd_composer} from './xsd_composer.js';


/**
 * Writes a RDF file.
 * Promisify N3 Writer's end method for clean async/await usage
 *
 * @async
 * @function n3_writer
 * @param {import('N3').Writer } n3writer - N3 Writer.
 * @param {string} file - The file path where the generated XSD will be written
 * @throws {Error} If no output file is specified.
 * @throws {TypeError} If the n3writer is invalid or missing or not a N3 Writer
 * @returns {Promise<void>} A promise that resolves when the file is written.
 */
async function n3_writer(n3writer, file) {
    if (typeof n3writer !== 'object' || !(n3writer && 'quadToString' in n3writer && 'addQuad' in n3writer)) {
        throw new TypeError('Invalid input: n3writer must be a N3.Writer.');
    }
    if (!file ) {
        throw new Error('Invalid options: no specified output.');
    }
    function _writerEndAsync(writer) {
        return new Promise((resolve, reject) => {
            writer.end((err, result) => {
                if (err) return reject(err);
                resolve(result);
            });
        });
    }
    try {
        ensureDirSync(file)
        const rdfResult = await _writerEndAsync(n3writer); // Get rdf-serialization as string
        await fs.promises.writeFile(file, rdfResult); // Write to file asynchronously
        console.log(`Rdf file written to ${file}`);
    }
    catch(e) {
        console.log(e.message);
    }
}


/**
 * Writes RDF data to a Parquet file using provided options.
 * Converts the RDF dataset to JSON-LD with a given frame, then serializes the result to Parquet format.
 * Writes an XSD file generated from the given RDF dataset and options.
 *
 *
 * @async
 * @function xsd_writer
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} rdf_dataset - RDF input as a dataset to be transformed into XSD.
 * @param {Object} xsdOptions - Options for XSD generation.
 * @param {string} xsdOptions.file - The file path where the generated XSD will be written
 * @param {string} xsdOptions.urn - The URN to be used for XSD composition.
 * @throws {TypeError} - If rdf_dataset is not a Dataset or DatasetCore.
 * @throws {Error} If the urn is missing.
 * @throws {Error} If the output file is missing.
 * @returns {Promise<void>} A promise that resolves when the file is written.
 */
async function xsd_writer(rdf_dataset, xsdOptions) {
    if (typeof rdf_dataset !== 'object' || !(rdf_dataset && 'match' in rdf_dataset && 'add' in rdf_dataset)) {
        throw new TypeError('Invalid input: rdf_dataset must be a DatasetCore.');
    }
    if (!xsdOptions.file ) {
        throw new Error('Invalid options: no specified output.');
    }
    if (!xsdOptions.urn) {
        throw new Error('Invalid options: no specified urn.');
    }
    ensureDirSync(xsdOptions.file)
    try {
        fs.writeFileSync(xsdOptions.file, await xsd_composer(rdf_dataset, xsdOptions.urn), 'utf8' );
        console.log(`Xsd enum file written to ${xsdOptions.file}`);
    }
    catch(e) {
        console.log(e.message);
    }
}



/**
 * Writes RDF data to a jsonld file using provided options.
 * Converts the RDF dataset to JSON-LD with a given frame, then serializes it.
 *
 * @async
 * @function jsonld_writer
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} data - RDF input as a dataset.
 * @param {{ file: string, frame: Frame }} jsonldOptions
 * @throws {Error} If input is invalid or extraction fails.
 * @throws {Error} If no output file is specified in jsonldOptions.
 * @throws {TypeError} If the frame is invalid or missing a @context property.
 * @throws {TypeError} - If data is not a Dataset or DatasetCore.
 * @returns {Promise<void>} A promise that resolves when the jsonld file has been written.
 */
async function jsonld_writer(data, jsonldOptions) {
    if (typeof data !== 'object' || !(data && 'match' in data && 'add' in data)) {
        throw new TypeError('Invalid input: data must be a DatasetCore.');
    }
    if (!jsonldOptions.file ) {
        throw new Error('Invalid options: no specified output.');
    }
    if (!jsonldOptions.frame["@context"]) {
        throw new TypeError("Expected an objects with a @context");
    }
    ensureDirSync(jsonldOptions.file)
    const jsonld = await rdf_to_jsonld(data, jsonldOptions.frame)
    if (!jsonld["@context"]) {
        throw new Error('Invalid input: this object is not jsonld. @context is missing.');
    }
    try {
        await fs.promises.writeFile(
            jsonldOptions.file,
            JSON.stringify(jsonld, null, 4)
        );
        console.log(`Jsonld file written to ${jsonldOptions.file}`);
    } catch (e) {
        console.error(e.toString());
    }
}

/**
 * Writes RDF data to a json file using provided options.
 * Converts the RDF dataset to JSON-LD with a given frame, then serializes the result to json format.
 *
 * @async
 * @function json_writer
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} data - RDF input as a dataset.
 * @param {{ file: string, frame: Frame }} jsonOptions
 * @param {string} [jsonPath='$.graph[*]'] - Optional JSONPath expression to extract array.
 * @throws {Error} If input is invalid or extraction fails.
 * @throws {Error} If no output file is specified in jsonOptions.
 * @throws {TypeError} - If data is not a Dataset or DatasetCore.
 * @throws {TypeError} If the frame is invalid or missing a @context property.
 * @returns {Promise<void>} A promise that resolves when the json file has been written.
 */
async function json_writer(data, jsonOptions, jsonPath='$.graph[*]') {
    if (typeof data !== 'object' || !(data && 'match' in data && 'add' in data)) {
        throw new TypeError('Invalid input: data must be a DatasetCore.');
    }
    if (!jsonOptions.file ) {
        throw new Error('Invalid options: no specified output.');
    }
    if (!jsonOptions.frame["@context"]) {
        throw new TypeError("Expected an objects with a @context");
    }
    ensureDirSync(jsonOptions.file)
    const jsonld = await rdf_to_jsonld(data, jsonOptions.frame)
    if (!jsonld["@context"]) {
        throw new Error('Invalid input: this object is not jsonld. @context is missing.');
    }
    try {
        await fs.promises.writeFile(
            jsonOptions.file,
            JSON.stringify(
                jp.query(jsonld, jsonPath),
                null, 4));
        console.log(`Json file written to ${jsonOptions.file}`);
    } catch (e) {
        console.error(e.toString());
    }
}

/**
 * Writes RDF data to a CSV file using provided options.
 * Converts the RDF dataset to JSON-LD with a given frame, then serializes the result to CSV format.
 *
 * @async
 * @function table_writer
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} data - RDF input as a dataset.
 * @param {{ file: string, frame: Frame }} csvOptions
 * @throws {Error} If input is invalid or extraction fails.
 * @throws {Error} If no output file is specified in csvOptions.
 * @throws {TypeError} - If data is not a Dataset or DatasetCore.
 * @throws {TypeError} If the frame is invalid or missing a @context property.
 * @returns {Promise<void>} A promise that resolves when the CSV file has been written.
 */
async function table_writer(data, csvOptions) {
    if (typeof data !== 'object' || !(data && 'match' in data && 'add' in data)) {
        throw new TypeError('Invalid input: data must be a DatasetCore.');
    }
    if (!csvOptions.file ) {
        throw new Error('Invalid options: no specified output.');
    }
    if (!csvOptions.frame["@context"]) {
        throw new TypeError("Expected an objects with a @context");
    }
    ensureDirSync(csvOptions.file)
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
        console.log(`CSV file written to ${csvOptions.file}`);
    } catch (e) {
        console.error(e.toString());
    }
}

/**
 * @function xlsx_writer
 * @param {{ file: string, sourcefile: string, sheetName: string }} excelOptions  - { file: string, sourcefile: string, sheetName: string } for excel output based on csv sourcefile
 * @throws {Error} If the input is missing.
 * @throws {Error} If the output is missing.
 * @throws {Error} If the sheetName is missing.
 */
function xlsx_writer(excelOptions) {
    if (!excelOptions.file ) {
        throw new Error('Invalid options: no specified output.');
    }
    if (!excelOptions.sourcefile) {
        throw new Error('Invalid options: no specified inputput.')
    }
    if (!excelOptions.sheetName) {
        throw new Error('Invalid options: no specified sheetName.')
    }
    ensureDirSync(excelOptions.file)
    try {
        convertCsvToXlsx(excelOptions.sourcefile, excelOptions.file, { sheetName : excelOptions.sheetName , overwrite : true });
        console.log(`Excel file written to ${excelOptions.file}`);
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
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} data - The RDF dataset to serialize.
 * @param {Object} parquetOptions - Options for Parquet serialization.
 * @param {string} parquetOptions.file - Path to the Parquet output file.
 * @param {Object} parquetOptions.frame - JSON-LD frame to apply for shaping the data.
 * @throws {Error} If no output file is specified in parquetOptions.
 * @throws {TypeError} If the frame is invalid or missing a @context property.
 * @throws {TypeError} - If data is not a Dataset or DatasetCore.
 * @returns {Promise<void>} A promise that resolves when the Parquet file has been written.
 */
async function parquet_writer(data, parquetOptions) {
    if (typeof data !== 'object' || !(data && 'match' in data && 'add' in data)) {
        throw new TypeError('Invalid input: data must be a DatasetCore.');
    }
    if (!parquetOptions.file ) {
        throw new Error('Invalid options: no specified output.');
    }
    if (!parquetOptions.frame["@context"]) {
        throw new TypeError("Expected an objects with a @context");
    }
    ensureDirSync(parquetOptions.file)
    const parquetSources = parquetSourcesFromJsonld(await rdf_to_jsonld(data, parquetOptions.frame))
    try {
        await parquetWriter(parquetSources, parquetOptions.file)
    } catch (e) {
        console.error(e.toString());
    }
}

export { json_writer, jsonld_writer, table_writer, xlsx_writer, parquet_writer, xsd_writer, n3_writer };