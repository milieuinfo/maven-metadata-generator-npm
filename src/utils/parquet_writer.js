'use strict';

import parquet from 'parquetjs-lite';
import jp from "jsonpath";



/**
 * @param {Array<Object>} array
 * @return {ParquetSchema}
 */
function inferSchema(array){
    if (!Array.isArray(array)) {
        throw new TypeError("Expected an array of objects");
    }
    const schemaDefinition = {};
    for (const row of array) {
        for (const key of Object.keys(row)) {
            schemaDefinition[key] = {}
        }
    }
    for (const row of array) {
        for (const key of Object.keys(schemaDefinition)) {
            if (row[key] === undefined) {
                schemaDefinition[key]['optional'] = true
            } else _evaluate_value(row[key], key, schemaDefinition);
        }
    }

    return new parquet.ParquetSchema(schemaDefinition) ;

    function _evaluate_value(val, key, schemaDefinition){
        if (Array.isArray(val)) {
            schemaDefinition[key]['repeated'] = true
            for (const element of val) {
                _evaluate_value(element, key, schemaDefinition)
            }
        } else if (typeof val === 'number') {
            schemaDefinition[key]['type'] = 'DOUBLE'
        } else if (typeof val === 'boolean') {
            schemaDefinition[key]['type'] = 'BOOLEAN'
        } else if (typeof val === 'string') {
            schemaDefinition[key]['type'] = 'UTF8'
        }
    }
}


/**
 * Converts each value in each row of the array using _typeJson.
 * Returns a new array of objects with typed values.
 * @param {Array<Object>} array
 * @return {Array<Object>}
 */
function typeArray(array) {
    if (!Array.isArray(array)) {
        throw new TypeError("Expected an array of objects");
    }
    return array.map(row => {
        if (typeof row !== 'object' || row === null) {
            throw new TypeError("Each row should be a non-null object");
        }
        const cleanRow = {};
        for (const key of Object.keys(row)) {
            cleanRow[key] = _typeJson(row[key]);
        }
        return cleanRow;
    });

    function _typeJson(original) {
        if (typeof original === 'string') {
            if (!Number.isNaN(parseFloat(original))){
                return parseFloat(original)
            } else if (original.toLowerCase() === 'true'){
                return true
            }else if (original.toLowerCase() === 'false'){
                return false
            } else return original ; // string
        } else return original; // boolean, number or object

    }
}

/**
 * Infers a Parquet schema and returns typed array and schema for Parquet writing.
 * @param {Array<Object>} array - Array of plain objects representing records.
 * @returns {{ typedArray: Array<Object>, parquetSchema: ParquetSchema }}
 * @throws {TypeError} If input is not an array.
 */
function parquetSourcesFromJsonArray(array) {
    if (!Array.isArray(array)) {
        throw new TypeError('Input to parquetSourcesFromJsonArray must be an array');
    }
    return parquetSourcesFromJsonld(array, '$[*]')
}

/**
 * Converts a JSON-LD object (with a 'graph' array) to Parquet sources.
 * @param {Object} json_ld - The JSON-LD object.
 * @param {string} [jsonPath='$.graph[*]'] - Optional JSONPath expression to extract array.\
 * @returns {{ typedArray: Array<Object>, parquetSchema: ParquetSchema }}
 * @throws {Error} If input is invalid or extraction fails.
 */
function parquetSourcesFromJsonld(json_ld, jsonPath = '$.graph[*]') {
    if (!json_ld || typeof json_ld !== 'object') {
        throw new Error('Invalid input: json_ld must be an object.');
    }
    let array;
    try {
        array = jp.query(json_ld, jsonPath);
    } catch (err) {
        throw new Error(`JSONPath query failed: ${err.message}`);
    }
    if (!Array.isArray(array)) {
        throw new Error('Extracted data is not an array.');
    }
    const typedArray = typeArray(array);
    const parquetSchema = inferSchema(typedArray);
    return {
        typedArray,
        parquetSchema
    };
}


async function parquetWriter(parquetSources, parquetFilePath) {
    const writer = await parquet.ParquetWriter.openFile(parquetSources["parquetSchema"], parquetFilePath);
    for (const row of parquetSources["typedArray"]) {
        await writer.appendRow(row);
    }
    await writer.close();
    console.log(`Parquet file written to ${parquetFilePath}`);
}

export {  parquetSourcesFromJsonld, parquetSourcesFromJsonArray, inferSchema, typeArray, parquetWriter };

