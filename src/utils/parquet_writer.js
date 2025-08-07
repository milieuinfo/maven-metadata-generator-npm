'use strict';

import parquet from 'parquetjs-lite';
import { typeJson } from './functions.js';
import jp from "jsonpath";


function evaluate_value(val, key, schemaDefinition){
    if (Array.isArray(val)) {
        schemaDefinition[key]['repeated'] = true
        for (const element of val) {
            evaluate_value(element, key, schemaDefinition)
        }
    } else if (typeof val === 'number') {
        schemaDefinition[key]['type'] = 'DOUBLE'
    } else if (typeof val === 'boolean') {
        schemaDefinition[key]['type'] = 'BOOLEAN'
    } else if (typeof val === 'string') {
        schemaDefinition[key]['type'] = 'UTF8'
    }
}

/**
 * @return {ParquetSchema}
 */
function inferSchema(array){
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
            } else evaluate_value(row[key], key, schemaDefinition);
        }
    }
    return new parquet.ParquetSchema(schemaDefinition) ;
}

/**
 * @return {Array}
 */
function typeArray(array) {
    if (Array.isArray(array)) {
        const typed_array = array.map(row => {
            const cleanRow = {};
            for (const key in row) {
                cleanRow[key] = typeJson(row[key]);
            }
            return cleanRow;
        });
        return typed_array;
    }
}

/**
 * @return {Object}
 */
function parquetSourcesFromJsonArray(array) {
    const typedArray = typeArray(array);
    const parquetSchema = inferSchema(typedArray)
    return {
        "typedArray": typedArray,
        "parquetSchema": parquetSchema
    }
}

/**
 * @return {Object}
 */
function parquetSourcesFromJsonld(json_ld) {
    const array = jp.query(json_ld, '$.graph[*]')
    return parquetSourcesFromJsonArray(array)
}

async function parquetWriter(parquetSources, parquetFilePath) {
    const writer = await parquet.ParquetWriter.openFile(parquetSources["parquetSchema"], parquetFilePath);
    for (const row of parquetSources["typedArray"]) {
        await writer.appendRow(row);
    }
    await writer.close();
    console.log(`Parquet file written to ${parquetFilePath}`);
}

export {  parquetSourcesFromJsonld, inferSchema, typeArray, parquetWriter };

