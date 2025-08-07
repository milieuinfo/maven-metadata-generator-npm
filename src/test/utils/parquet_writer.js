
import {
    parquetSourcesFromJsonld,
    inferSchema,
    typeArray,
    parquetWriter
} from '../../utils/parquet_writer.js';
import { json_ld, succes_frame_parquet, fail_frame, json_ld_parquet } from './variables.js' ;
import {test, describe, it} from 'node:test' ;
import assert from "node:assert";
import jsonld from 'jsonld';
import jp from "jsonpath";

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
        "nummer": 20,
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
        "waar": "true",
        "prefLabel": "Codelijst bouw"
    }
]

const typed_controll_array = [
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
        "nummer": 20,
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
        "nummer": 0.6,
        "waar": true,
        "prefLabel": "Codelijst bouw"
    }
]

describe("Writing a parquet file from jsonld.", (s) => {
    test('Parquetwriter requires a schema and an array of objects that are well typed ' +
        'This means: ' +
        '1) if the value of a key is declared as an array (repeated field), it must always be an array for every record — not a string or null. ' +
        ' => Use "@container": "@set" in the @context of a frame' +
        '2) type the json array of objects, cast the values, before infering the schema ', async (t) => {
        var my_jsonld = await jsonld.frame(json_ld_parquet, succes_frame_parquet)
        const array = jp.query(my_jsonld, '$.graph[*]')
        const typed_array = typeArray(array)
        const parquetSchema = inferSchema(typed_array)
        const parquetSources = parquetSourcesFromJsonld(my_jsonld)
        await t.test("Succes scenario: check input array", (t) => {
            assert.deepStrictEqual(array, controll_array);
        });
        await t.test("Succes scenario: check typed array", (t) => {
            assert.deepStrictEqual(typed_array, typed_controll_array);
        });
        await t.test("Succes scenario: parquetSources" , (t) => {
            assert.deepStrictEqual(parquetSources['typedArray'], typed_array);
        });
        await t.test("Succes scenario: parquetSources" , (t) => {
            assert.deepStrictEqual(parquetSources['typedArray'], typed_array);
        });
        await t.test("Succes scenario: parquetSources" , (t) => {
            assert.deepStrictEqual(parquetSources['parquetSchema'], parquetSchema);
        });
        await parquetWriter(parquetSources, "src/test/result/test.parquet")
    });



});