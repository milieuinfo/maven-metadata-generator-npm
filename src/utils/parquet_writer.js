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
 *
 * @example
 * const data = [
 *   { id: 1, tags: ["foo", "bar"] },
 *   { id: 2, tags: ["baz"] }
 * ];
 * const schema = inferSchema(data);
 * console.log(schema);
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

    // Walk through values and update schema definition.
    // Nested objects of one column are collected over ALL rows and their schema is inferred
    // in one go, so a nested field that is missing in some rows becomes optional instead of
    // the schema of the last row winning.
    const nestedObjects = {};
    const collectNested = (key, value) => (nestedObjects[key] ??= []).push(value);
    for (const row of array) {
        for (const key of Object.keys(schemaDefinition)) {
            const value = row[key];
            switch (_getValueKind(value)) {
                case "null":
                case "undefined":
                    schemaDefinition[key].optional = true;
                    break;

                case "object":
                    collectNested(key, value);
                    break;

                case "array": {
                    schemaDefinition[key].repeated = true;
                    for (const element of value) {
                        if (_getValueKind(element) === "object") {
                            collectNested(key, element);
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
    for (const [key, objects] of Object.entries(nestedObjects)) {
        schemaDefinition[key].fields = inferSchema(objects).schema;
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
                    collectNested(key, element);
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
 * Make every column either "all objects" or "all scalars".
 *
 * JSON-LD framing can produce a column that holds an IRI string in one row and an object
 * in another (e.g. sh:value or sh:sourceShape in a SHACL validation report). Parquet needs
 * one type per column, so in such a mixed column every object is replaced by a scalar:
 * its `@id` or `@value` when that is all it holds, otherwise its JSON serialization.
 * Columns that only hold objects are harmonized recursively.
 *
 * @param {Array<Object>} array - Rows (plain objects).
 * @returns {Array<Object>} - New rows; the input is not modified.
 */
function harmonizeColumns(array) {
    const rows = array.map(row => ({ ...row }));
    const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
    const valuesOf = v => (v === null || v === undefined) ? [] : Array.isArray(v) ? v : [v];
    const toScalar = v => {
        if (!isObject(v)) return v;
        const keys = Object.keys(v);
        if (keys.length === 1 && keys[0] === '@id') return v['@id'];
        if ('@value' in v && keys.every(k => ['@value', '@type', '_type', '@language'].includes(k))) return v['@value'];
        return JSON.stringify(v);
    };
    const keys = new Set(rows.flatMap(row => Object.keys(row)));
    for (const key of keys) {
        const values = rows.flatMap(row => valuesOf(row[key]));
        const hasObject = values.some(isObject);
        const hasScalar = values.some(v => !isObject(v) && !Array.isArray(v));
        if (hasObject && hasScalar) {
            for (const row of rows) {
                if (row[key] === null || row[key] === undefined) continue;
                row[key] = Array.isArray(row[key]) ? row[key].map(toScalar) : toScalar(row[key]);
            }
        } else if (hasObject) {
            const nested = harmonizeColumns(values);
            let i = 0;
            for (const row of rows) {
                if (row[key] === null || row[key] === undefined) continue;
                row[key] = Array.isArray(row[key]) ? row[key].map(() => nested[i++]) : nested[i++];
            }
        }
    }
    return rows;
}

/**
 * Normalize values in an array of objects, coercing stringified numbers
 * and booleans into proper types. Leaves objects/arrays intact.
 *
 * Example conversions:
 *  "42"   → 42
 *  "true" → true
 *  "foo"  → "foo"
 *
 * @param {Array<Object>} array - Input data as array of objects.
 * @returns {Array<Object>} - New array with typed values.
 * @throws {TypeError} If input is not an array of objects.
 *
 * @example
 * const data = [
 *   { age: "42", active: "true" },
 *   { age: "7.5", active: "false" }
 * ];
 * const typed = typeArray(data);
 * // → [ { age: 42, active: true }, { age: 7.5, active: false } ]
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
            if (!Number.isNaN(Number(original)) && original.trim() !== '') {
                return Number(original);
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
 *
 * @example
 * const data = [
 *   { name: "Alice", age: "30" },
 *   { name: "Bob", age: 25 }
 * ];
 * const { typedArray, parquetSchema } = parquetSourcesFromJsonArray(data);
 * console.log(typedArray);
 * // → [ { name: "Alice", age: 30 }, { name: "Bob", age: 25 } ]
 * console.log(parquetSchema);
 */
function parquetSourcesFromJsonArray(array) {
    if (!Array.isArray(array)) {
        throw new TypeError('Input to parquetSourcesFromJsonArray must be an array');
    }
    if (array.length === 0) {
        throw new Error('Array is empty.');
    }
    const typedArray = typeArray(harmonizeColumns(array));
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
 *
 * @example
 * const jsonld = {
 *   "@context": "https://schema.org",
 *   "graph": [
 *     { "@id": "1", name: "Alice", age: "30" },
 *     { "@id": "2", name: "Bob", age: 25 }
 *   ]
 * };
 * const { typedArray, parquetSchema } = parquetSourcesFromJsonld(jsonld);
 * console.log(typedArray);
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

    const typedArray = typeArray(harmonizeColumns(array));
    const parquetSchema = inferSchema(typedArray);
    return { typedArray, parquetSchema };
}

/**
 * Convert a schema definition (as produced by inferSchema) to one where every
 * repeated field is written as a standard Parquet LIST (3-level structure):
 *
 *   optional group <name> (LIST) {
 *     repeated group list {
 *       optional <type> element;
 *     }
 *   }
 *
 * Bare `repeated` fields (the legacy 1-level encoding) are read as a list by
 * spec-compliant readers (pyarrow, Spark, DuckDB), but several viewers show a
 * one-element list as a scalar. The LIST annotation removes that ambiguity.
 *
 * @param {Object} schemaDefinition - Field definitions, e.g. `parquetSchema.schema`.
 * @returns {Object} - New field definitions with LIST groups.
 */
function toListSchema(schemaDefinition) {
    const result = {};
    for (const [key, def] of Object.entries(schemaDefinition)) {
        const { repeated, optional, ...rest } = def;
        if (repeated) {
            const element = rest.fields
                ? { optional: true, fields: toListSchema(rest.fields) }
                : { optional: true, type: rest.type || 'UTF8' };
            result[key] = {
                type: 'LIST',
                optional: true,
                fields: { list: { repeated: true, fields: { element } } }
            };
        } else if (rest.fields) {
            result[key] = { ...(optional ? { optional } : {}), fields: toListSchema(rest.fields) };
        } else {
            result[key] = { ...def };
        }
    }
    return result;
}

/**
 * Reshape a row to match a schema produced by toListSchema:
 * arrays become `{ list: [{ element: value }, ...] }`.
 * A scalar value in a repeated field is wrapped as a one-element list.
 * A missing, null or empty value in a repeated field is written as a null LIST
 * (definition level 0), never as an empty LIST. In RDF an absent property and an
 * empty set of values mean the same. Some readers cannot handle empty LISTs:
 * the Parquet viewer of IntelliJ (Big Data Tools) reads an empty LIST as a value,
 * which shifts all following values of that column or fails with
 * "Can't read value in column [..., list, element]".
 *
 * @param {Object} row - A typed row.
 * @param {Object} schemaDefinition - The ORIGINAL field definitions (from inferSchema).
 * @returns {Object} - Row in LIST layout.
 */
function toListRow(row, schemaDefinition) {
    const result = {};
    const keys = new Set([...Object.keys(row), ...Object.keys(schemaDefinition)]);
    for (const key of keys) {
        const def = schemaDefinition[key];
        const value = row[key];
        if (def?.repeated) {
            const values = (value === null || value === undefined) ? []
                : Array.isArray(value) ? value : [value];
            if (values.length === 0) continue; // null LIST, see above
            const convert = v => (def.fields && v !== null && typeof v === 'object')
                ? toListRow(v, def.fields)
                : v;
            result[key] = { list: values.map(v => ({ element: convert(v) })) };
        } else if (value === null || value === undefined) {
            if (key in row) result[key] = value;
        } else if (def?.fields && typeof value === 'object') {
            result[key] = toListRow(value, def.fields);
        } else {
            result[key] = value;
        }
    }
    return result;
}

/**
 * Inverse of toListRow: turn `{ list: [{ element }] }` back into plain arrays.
 * Useful when reading back a file with parquetjs-lite, which returns the raw
 * LIST structure.
 *
 * Pass the original schema definition (from inferSchema) to get `[]` for every
 * repeated field without values: a null LIST (as written by toListRow, absent
 * from the row returned by parquetjs-lite) and an empty LIST (returned as `{}`,
 * found in files written by older versions). Without the schema those fields
 * stay absent or `{}`.
 *
 * @param {*} value - A row (or value) as returned by a ParquetReader cursor.
 * @param {Object} [schemaDefinition] - The ORIGINAL field definitions (from inferSchema).
 * @returns {*} - The same data with LIST groups replaced by arrays.
 */
function fromListRow(value, schemaDefinition) {
    if (Array.isArray(value)) return value.map(v => fromListRow(v, schemaDefinition));
    if (value === null || typeof value !== 'object' || Buffer.isBuffer(value) || value instanceof Date) {
        return value;
    }
    const keys = Object.keys(value);
    if (keys.length === 1 && keys[0] === 'list' && Array.isArray(value.list)) {
        return value.list.map(item => fromListRow(item.element, schemaDefinition));
    }
    const result = {};
    const repeatedKeys = Object.keys(schemaDefinition ?? {}).filter(k => schemaDefinition[k]?.repeated);
    for (const k of new Set([...keys, ...repeatedKeys])) {
        const def = schemaDefinition?.[k];
        const v = value[k];
        if (def?.repeated && (v === null || v === undefined
            || (typeof v === 'object' && Object.keys(v).length === 0))) {
            result[k] = [];
        } else {
            result[k] = fromListRow(v, def?.fields);
        }
    }
    return result;
}

/**
 * Write a Parquet file from inferred schema + typed rows.
 * Repeated fields are written as standard Parquet LIST columns (see toListSchema).
 *
 * @param {{ typedArray: Array<Object>, parquetSchema: parquet.ParquetSchema }} parquetSources
 *        Object with schema + rows (from parquetSourcesFromJsonArray/Jsonld).
 * @param {string} parquetFilePath - Destination file path.
 * @returns {Promise<void>} - Resolves when file is written.
 *
 * @example
 * const data = [
 *   { id: 1, name: "Alice" },
 *   { id: 2, name: "Bob" }
 * ];
 * const sources = parquetSourcesFromJsonArray(data);
 * await parquetWriter(sources, "./output.parquet");
 */
async function parquetWriter(parquetSources, parquetFilePath) {
    const schemaDefinition = parquetSources.parquetSchema.schema;
    const listSchema = new parquet.ParquetSchema(toListSchema(schemaDefinition));
    const writer = await parquet.ParquetWriter.openFile(listSchema, parquetFilePath);
    for (const row of parquetSources.typedArray) {
        await writer.appendRow(toListRow(row, schemaDefinition));
    }
    await writer.close();
    console.log(`Parquet file written to ${parquetFilePath}`);
}

export {
    harmonizeColumns,
    parquetSourcesFromJsonld,
    parquetSourcesFromJsonArray,
    inferSchema,
    typeArray,
    parquetWriter,
    toListSchema,
    toListRow,
    fromListRow
};
