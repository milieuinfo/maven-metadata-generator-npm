'use strict';

import parquet from 'parquetjs-lite';
import jp from "jsonpath";

/**
 * Infer a Parquet schema from an array of JSON-like objects.
 *
 * Handles nested objects and arrays, promotes types if necessary,
 * and marks fields as optional if missing in some rows.
 *
 * Type resolution order (weak → strong):
 * BOOLEAN → INT64 → DOUBLE → UTF8
 *
 * Arrays:
 * - Arrays of primitives are stored as `repeated`.
 * - Arrays of objects are recursively inferred as nested schemas.
 *
 * @param {Array<Object>} array - Input data as array of objects.
 * @throws {TypeError} If input is not an array.
 * @returns {parquet.ParquetSchema} - Inferred Parquet schema.
 */
function inferSchema(array) {
    if (!Array.isArray(array)) {
        throw new TypeError("Expected an array of objects");
    }

    const schemaDefinition = {};

    // Collect all keys across rows
    for (const row of array) {
        for (const key of Object.keys(row)) {
            schemaDefinition[key] = {};
        }
    }

    // Walk through values and update schema definition
    for (const row of array) {
        for (const key of Object.keys(schemaDefinition)) {
            const value = row[key];
            switch (_getValueKind(value)) {
                case "null":
                case "undefined":
                    schemaDefinition[key].optional = true;
                    break;

                case "object": {
                    const s = inferSchema([value]);
                    schemaDefinition[key].fields = s.schema;
                    break;
                }

                case "array": {
                    schemaDefinition[key].repeated = true;
                    for (const element of value) {
                        if (_getValueKind(element) === "object") {
                            const s = inferSchema([element]);
                            schemaDefinition[key].fields = s.schema;
                        } else {
                            _evaluate_value(element, key, schemaDefinition);
                        }
                    }
                    break;
                }

                default:
                    _evaluate_value(value, key, schemaDefinition);
            }
        }
    }

    return new parquet.ParquetSchema(schemaDefinition);

    /**
     * Evaluate a single value and refine schema type.
     *
     * @param {*} val - The value to evaluate.
     * @param {string} key - Schema key.
     * @param {Object} schemaDefinition - Current schema definition.
     */
    function _evaluate_value(val, key, schemaDefinition) {
        if (Array.isArray(val)) {
            schemaDefinition[key].repeated = true;
            for (const element of val) {
                if (_getValueKind(element) === "object") {
                    const s = inferSchema([element]);
                    schemaDefinition[key].fields = s.schema;
                } else {
                    _evaluate_value(element, key, schemaDefinition);
                }
            }
        } else if (typeof val === 'number') {
            const numericType = Number.isInteger(val) ? 'INT64' : 'DOUBLE';
            schemaDefinition[key].type = _resolveType(schemaDefinition[key].type, numericType);
        } else if (typeof val === 'boolean') {
            schemaDefinition[key].type = _resolveType(schemaDefinition[key].type, 'BOOLEAN');
        } else if (typeof val === 'string') {
            schemaDefinition[key].type = _resolveType(schemaDefinition[key].type, 'UTF8');
        }
    }

    /**
     * Classify a value into a simplified kind.
     *
     * @param {*} value - The value to classify.
     * @returns {"null"|"undefined"|"array"|"object"|"string"|"number"|"boolean"}
     */
    function _getValueKind(value) {
        if (value === null) return "null";
        if (Array.isArray(value)) return "array";
        if (typeof value === "object") return "object";
        return typeof value;
    }

    /**
     * Promote types based on a defined order.
     *
     * @param {string|undefined} existing - Existing schema type.
     * @param {string} incoming - New candidate type.
     * @returns {string} - Promoted type.
     */
    function _resolveType(existing, incoming) {
        const typeOrder = ["BOOLEAN", "INT64", "DOUBLE", "UTF8"];
        if (!existing) return incoming;
        const existingIdx = typeOrder.indexOf(existing);
        const incomingIdx = typeOrder.indexOf(incoming);
        return typeOrder[Math.max(existingIdx, incomingIdx)];
    }
}

/**
 * Normalize values in an array of objects, coercing stringified numbers
 * and booleans into proper types. Leaves objects/arrays intact.
 *
 * Example:
 *  "42"   → 42
 *  "true" → true
 *  "foo"  → "foo"
 *
 * @param {Array<Object>} array - Input data as array of objects.
 * @returns {Array<Object>} - New array with typed values.
 * @throws {TypeError} If input is not an array of objects.
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
            if (!Number.isNaN(parseFloat(original))) {
                return parseFloat(original);
            } else if (original.toLowerCase() === 'true') {
                return true;
            } else if (original.toLowerCase() === 'false') {
                return false;
            } else {
                return original; // string
            }
        }
        return original; // boolean, number, object, array
    }
}

/**
 * Build Parquet schema + typed data array from plain JSON array.
 *
 * @param {Array<Object>} array - Input JSON records.
 * @returns {{ typedArray: Array<Object>, parquetSchema: parquet.ParquetSchema }}
 * @throws {TypeError|Error} If input is invalid.
 */
function parquetSourcesFromJsonArray(array) {
    if (!Array.isArray(array)) {
        throw new TypeError('Input to parquetSourcesFromJsonArray must be an array');
    }
    if (array.length === 0) {
        throw new Error('Array is empty.');
    }
    const typedArray = typeArray(array);
    const parquetSchema = inferSchema(typedArray);
    return { typedArray, parquetSchema };
}

/**
 * Build Parquet schema + typed data array from a JSON-LD object.
 *
 * Uses JSONPath to extract records (defaults to `$.graph[*]`).
 *
 * @param {Object} json_ld - A JSON-LD object with an @context.
 * @param {string} [jsonPath='$.graph[*]'] - JSONPath expression to select records.
 * @returns {{ typedArray: Array<Object>, parquetSchema: parquet.ParquetSchema }}
 * @throws {Error|TypeError} If input is invalid or extraction fails.
 */
function parquetSourcesFromJsonld(json_ld, jsonPath = '$.graph[*]') {
    if (!json_ld || typeof json_ld !== 'object') {
        throw new Error('Invalid input: json_ld must be an object.');
    }
    if (!json_ld["@context"]) {
        throw new Error('Invalid input: this object is not jsonld. @context is missing.');
    }

    let array;
    try {
        array = jp.query(json_ld, jsonPath);
    } catch (err) {
        throw new Error(`JSONPath query failed: ${err.message}`);
    }

    if (!Array.isArray(array)) {
        throw new TypeError('Extracted data is not an array.');
    }
    if (array.length === 0) {
        throw new Error('Extracted array is empty.');
    }

    const typedArray = typeArray(array);
    const parquetSchema = inferSchema(typedArray);
    return { typedArray, parquetSchema };
}

/**
 * Write a Parquet file from inferred schema + typed rows.
 *
 * @param {{ typedArray: Array<Object>, parquetSchema: parquet.ParquetSchema }} parquetSources
 *        Object with schema + rows (from parquetSourcesFromJsonArray/Jsonld).
 * @param {string} parquetFilePath - Destination file path.
 * @returns {Promise<void>} - Resolves when file is written.
 */
async function parquetWriter(parquetSources, parquetFilePath) {
    const writer = await parquet.ParquetWriter.openFile(parquetSources.parquetSchema, parquetFilePath);
    for (const row of parquetSources.typedArray) {
        await writer.appendRow(row);
    }
    await writer.close();
    console.log(`Parquet file written to ${parquetFilePath}`);
}

export {
    parquetSourcesFromJsonld,
    parquetSourcesFromJsonArray,
    inferSchema,
    typeArray,
    parquetWriter
};
