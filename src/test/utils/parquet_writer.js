import {
    jsonld_to_table
} from '../../utils/functions.js';
import {
    writeParquet,
    inferSchema,
    parseCsvToJson
} from '../../utils/parquet_writer.js';
import { json_ld, succes_frame_parquet, fail_frame, json_ld_parquet } from './variables.js' ;
import {test, describe, it} from 'node:test' ;
import assert from "node:assert";
import jsonld from 'jsonld';
import jp from "jsonpath";
import  { json2csv }  from 'json-2-csv';

const controll_array = [
    {
        "id": "https://data.omgeving.vlaanderen.be/id/collection/gebouw/verwaarlozing",
        "type": [
            "http://www.w3.org/2004/02/skos/core#Collection",
            "http://example.com#Klasse"
        ],
        "altLabel": "co_verwaarlozing",
        "member": [
            "https://data.omgeving.vlaanderen.be/id/concept/gebouw/schoorsteen",
            "https://data.omgeving.vlaanderen.be/id/concept/gebouw/buitenmuur"
        ],
        "prefLabel": "Collectie van concepten die gebruikt worden binnen de applicatie verwaarlozing en leegstand."
    },
    {
        "id": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/buitenmuur",
        "type": [
            "http://www.w3.org/2004/02/skos/core#Concept"
        ],
        "altLabel": "buiten muur",
        "inscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/gebouw",
        "prefLabel": "buitenmuur"
    },
    {
        "id": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/schoorsteen",
        "type": [
            "http://www.w3.org/2004/02/skos/core#Concept"
        ],
        "altLabel": "schoor steen",
        "inscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/gebouw",
        "prefLabel": "schoorsteen"
    },
    {
        "id": "https://data.omgeving.vlaanderen.be/id/conceptscheme/gebouw",
        "type": [
            "http://www.w3.org/2004/02/skos/core#ConceptScheme"
        ],
        "nietwaar": false,
        "nummer": "0.6",
        "waar": true,
        "prefLabel": "Codelijst bouw"
    }
]

const normalized_controll_array = [
    {
        "id": "https://data.omgeving.vlaanderen.be/id/collection/gebouw/verwaarlozing",
        "type": "[\"http://www.w3.org/2004/02/skos/core#Collection\",\"http://example.com#Klasse\"]",
        "altLabel": "co_verwaarlozing",
        "member": "[\"https://data.omgeving.vlaanderen.be/id/concept/gebouw/schoorsteen\",\"https://data.omgeving.vlaanderen.be/id/concept/gebouw/buitenmuur\"]",
        "prefLabel": "Collectie van concepten die gebruikt worden binnen de applicatie verwaarlozing en leegstand.",
        "inscheme": "null",
        "nietwaar": "null",
        "nummer": "null",
        "waar": "null"
    },
    {
        "id": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/buitenmuur",
        "type": "[\"http://www.w3.org/2004/02/skos/core#Concept\"]",
        "altLabel": "buiten muur",
        "member": "null",
        "prefLabel": "buitenmuur",
        "inscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/gebouw",
        "nietwaar": "null",
        "nummer": "null",
        "waar": "null"
    },
    {
        "id": "https://data.omgeving.vlaanderen.be/id/concept/gebouw/schoorsteen",
        "type": "[\"http://www.w3.org/2004/02/skos/core#Concept\"]",
        "altLabel": "schoor steen",
        "member": "null",
        "prefLabel": "schoorsteen",
        "inscheme": "https://data.omgeving.vlaanderen.be/id/conceptscheme/gebouw",
        "nietwaar": "null",
        "nummer": "null",
        "waar": "null"
    },
    {
        "id": "https://data.omgeving.vlaanderen.be/id/conceptscheme/gebouw",
        "type": "[\"http://www.w3.org/2004/02/skos/core#ConceptScheme\"]",
        "altLabel": "null",
        "member": "null",
        "prefLabel": "Codelijst bouw",
        "inscheme": "null",
        "nietwaar": "false",
        "nummer": "0.6",
        "waar": "true"
    }
]

describe("Writing a parquet file requires data, an array of objects, and a schema.", (s) => {
    test('Parquet schemas must be consistent across all records. ' +
        '1) This means: if the value of a key is declared as an array (repeated field), it must always be an array for every record — not a string or null. ' +
        '2) Every object must have the same keys ' +
        '3) Normalize the Data Before infering the schema ', async (t) => {
        var my_jsonld = await jsonld.frame(json_ld_parquet, succes_frame_parquet)
        const array = jp.query(my_jsonld, '$.graph[*]')
        const csv = await json2csv(array,
            {emptyFieldValue: null,
                expandArrayObjects: false});
        const csv2 = await json2csv(await jsonld_to_table(my_jsonld),
            {emptyFieldValue: null,
                expandArrayObjects: false});
        writeParquet(csv2)
        const test = await writeParquet(csv2) // arrays_from_strings(parseCsvToJson(csv2))
        await t.test("Succes scenario for normalisation of data: check input array", (t) => {
            assert.deepStrictEqual(array, controll_array);
        });
        await t.test("Succes scenario for normalisation of data: array length", (t) => {
            assert.strictEqual(parseCsvToJson(csv).length, 4);
        });
        await t.test("Succes scenario for normalisation of data: identical array", (t) => {
            assert.deepStrictEqual(parseCsvToJson(csv), normalized_controll_array);
        });
    });
    test('Parquet schemas must be as precise as possible' +
        'This means: ' +
        '1) numeric values should be typed \'INT64\' ' +
        '2) boolean values should be typed \'BOOLEAN\' ' +
        '3) Optional values shoud be typed  \'optional: true\' ', async (t) => {
        var my_jsonld = await jsonld.frame(json_ld_parquet, succes_frame_parquet)
        const array = jp.query(my_jsonld, '$.graph[*]')
        const csv = await json2csv(array,
            {emptyFieldValue: null,
                expandArrayObjects: false});

        await t.test("Succes scenario for normalisation of data: check input array", (t) => {
            assert.deepStrictEqual(array, controll_array);
        });
        await t.test("Succes scenario for normalisation of data: array length", (t) => {
            assert.strictEqual(parseCsvToJson(csv).length, 3);
        });
        await t.test("Succes scenario for normalisation of data: identical array", (t) => {
            assert.deepStrictEqual(parseCsvToJson(csv), normalized_controll_array);
        });

    });

});