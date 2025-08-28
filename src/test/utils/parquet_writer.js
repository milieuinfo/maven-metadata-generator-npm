import {
    parquetSourcesFromJsonld,
    parquetSourcesFromJsonArray,
    inferSchema,
    typeArray,
    parquetWriter
} from '../../utils/parquet_writer.js';
import { succes_frame_parquet, fail_frame_2, json_ld_parquet } from './variables.js' ;
import {test, describe} from 'node:test' ;
import assert from "node:assert";
import jsonld from 'jsonld';
import jp from "jsonpath";




const nested_array2 = [
    {
        "@id": "b109",
        "_type": "http://www.w3.org/ns/shacl#ValidationResult",
        "focusNode": "S2",
        "resultMessage": "More than 1 values",
        "resultPath": {
            "@id": "b26",
            "inversePath": "http://www.w3.org/2004/02/skos/core#notation"
        },
        "resultSeverity": "http://www.w3.org/ns/shacl#Violation",
        "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MaxCountConstraintComponent",
        "sourceShape": "https://data.omgeving.vlaanderen.be/id/propertyshape/unique_notation"
    },
    {
        "@id": "b115",
        "_type": "http://www.w3.org/ns/shacl#ValidationResult",
        "focusNode": "S3",
        "resultMessage": "More than 1 values",
        "resultPath": [{
            "@id": "b26",
            "inversePath": "http://www.w3.org/2004/02/skos/core#notation"
        },{
            "@id": "b27",
            "inversePath": "http://www.w3.org#something"
        }],
        "resultSeverity": "http://www.w3.org/ns/shacl#Violation",
        "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MaxCountConstraintComponent",
        "sourceShape": "https://data.omgeving.vlaanderen.be/id/propertyshape/unique_notation"
    }
]

const nested_array = [
    {
        "@id": "b109",
        "_type": "http://www.w3.org/ns/shacl#ValidationResult",
        "focusNode": "S2",
        "resultMessage": "More than 1 values",
        "resultPath": {
            "@id": "b25",
            "inversePath": "http://www.w3.org/2004/02/skos/core#notation"
        },
        "resultSeverity": "http://www.w3.org/ns/shacl#Violation",
        "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MaxCountConstraintComponent",
        "sourceShape": "https://data.omgeving.vlaanderen.be/id/propertyshape/unique_notation"
    },
    {
        "@id": "b110",
        "_type": "http://www.w3.org/ns/shacl#ValidationResult",
        "focusNode": "S2",
        "resultMessage": "More than 1 values",
        "resultPath": {
            "@id": "b25",
            "inversePath": "http://www.w3.org/2004/02/skos/core#notation"
        },
        "resultSeverity": "http://www.w3.org/ns/shacl#Violation",
        "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MaxCountConstraintComponent",
        "sourceShape": "https://data.omgeving.vlaanderen.be/id/propertyshape/unique_notation"
    },
    {
        "@id": "b111",
        "_type": "http://www.w3.org/ns/shacl#ValidationResult",
        "focusNode": "S2",
        "resultMessage": "More than 1 values",
        "resultPath": {
            "@id": "b25",
            "inversePath": "http://www.w3.org/2004/02/skos/core#notation"
        },
        "resultSeverity": "http://www.w3.org/ns/shacl#Violation",
        "sourceConstraintComponent": "http://www.w3.org/ns/shacl#MaxCountConstraintComponent",
        "sourceShape": "https://data.omgeving.vlaanderen.be/id/propertyshape/unique_notation"
    }
]

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

const control_parquetSchema = {
    "schema": {
        "id": {
            "type": "UTF8",
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "type": {
            "repeated": true,
            "type": "UTF8",
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "altLabel": {
            "type": "UTF8",
            "optional": true,
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "member": {
            "repeated": true,
            "type": "UTF8",
            "optional": true,
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "prefLabel": {
            "type": "UTF8",
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "nummer": {
            "optional": true,
            "type": "DOUBLE",
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "inscheme": {
            "optional": true,
            "type": "UTF8",
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "nietwaar": {
            "optional": true,
            "type": "BOOLEAN",
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        },
        "waar": {
            "optional": true,
            "type": "BOOLEAN",
            "encoding": "PLAIN",
            "compression": "UNCOMPRESSED"
        }
    }
}


describe("Writing a parquet file from jsonld.", () => {
    test('Parquetwriter requires a schema and an array of objects that are well typed ' +
        'This means: ' +
        '1) if the value of a key is declared as an array (repeated field), it must always be an array for every record — not a string or null. ' +
        ' => Use "@container": "@set" in the @context of a frame. ' +
        '2) type the json array of objects, cast the values, before infering the schema ', async (t) => {
        var my_jsonld = await jsonld.frame(json_ld_parquet, succes_frame_parquet)
        var my_fail_jsonld = await jsonld.frame(json_ld_parquet, fail_frame_2)
        const array = jp.query(my_jsonld, '$.graph[*]')
        const typed_array = typeArray(array)
        const parquetSchema = inferSchema(typed_array)
        const parquetSourcesFromArray = parquetSourcesFromJsonArray(array)
        const parquetSourcesFromLd = parquetSourcesFromJsonld(my_jsonld)
        await parquetWriter(parquetSourcesFromLd, "src/test/result/test.parquet")
        await t.test("Succes scenario: check input array", () => {
            assert.deepStrictEqual(array, controll_array);
        });
        await t.test("Succes scenario: check typed array", () => {
            assert.deepStrictEqual(typed_array, typed_controll_array);
        });
        await t.test("Succes scenario: parquetSources typedArray" , () => {
            assert.deepStrictEqual(parquetSourcesFromLd.typedArray, typed_controll_array);
        });
        await t.test("Succes scenario: typedArray; parquetSourcesFromJsonArray vs. parquetSourcesFromJsonld" , () => {
            assert.deepStrictEqual(parquetSourcesFromLd.typedArray, parquetSourcesFromArray.typedArray);
        });

        await t.test("Succes scenario: parquetSources parquetSchema" , () => {
            assert.deepStrictEqual(parquetSourcesFromLd.parquetSchema, parquetSchema);
            assert.deepStrictEqual(control_parquetSchema.schema, parquetSchema.schema);
        });
        await t.test("Succes scenario: parquetSchema; parquetSourcesFromJsonArray vs. parquetSourcesFromJsonld" , () => {
            assert.deepStrictEqual(parquetSourcesFromLd.parquetSchema, parquetSourcesFromArray.parquetSchema);
        });

        await t.test('parquetSourcesFromJsonld throws if input is not jsonld with graph key', () => {
            assert.throws(() => parquetSourcesFromJsonld(my_fail_jsonld),
                Error,
                'Input to parquetSourcesFromJsonld must be jsonld with a graph key '
            );
        });

    });

    test('inferSchema: should throw TypeError if input is not an array', () => {
        assert.throws(() => inferSchema(null), TypeError);
        assert.throws(() => inferSchema({}), TypeError);
        assert.throws(() => inferSchema('foo'), TypeError);
    });

    test('inferSchema: should infer schema for number, string, and boolean fields', () => {
        const data = [
            { a: 1, b: 'x', c: true },
            { a: 2, b: 'y', c: false }
        ];
        const schema = inferSchema(data);
        assert(schema.schema.a.type === 'DOUBLE');
        assert(schema.schema.b.type === 'UTF8');
        assert(schema.schema.c.type === 'BOOLEAN');
    });

    test('inferSchema: should handle missing (optional) fields', () => {
        const data = [
            { a: 1, b: 'x' },
            { a: 2 }
        ];
        const schema = inferSchema(data);
        assert(schema.schema.b.optional === true);
    });

    test('inferSchema: should mark arrays as repeated', () => {
        const data = [
            { arr: [1, 2, 3] },
            { arr: [4] }
        ];
        const schema = inferSchema(data);
        assert(schema.schema.arr.repeated === true);
    });

    test('parquetSourcesFromJsonArray throws if input is not array', () => {
        assert.throws(
            () => parquetSourcesFromJsonArray('foo'),
            TypeError,
            'Input to parquetSourcesFromJsonArray must be an array'
        );
        assert.throws(
            () => parquetSourcesFromJsonArray({ a: 2 , b: "x"}),
            TypeError,
            'Input to parquetSourcesFromJsonArray must be an array'
        );
    });

    test('parquetSourcesFromJsonArray processes an array', () => {
        const arr = [{ a: 1 }, { a: 2 , b: "x"}];
        const result = parquetSourcesFromJsonArray(arr);
        assert.ok(result);
        assert(result.parquetSchema.schema.a.type === 'DOUBLE');
        assert(result.parquetSchema.schema.b.type === 'UTF8');
    });

    test('inferSchema: should handle nested objects', async() => {
        const typed_array = typeArray(nested_array);
        const schema = inferSchema(typed_array);
        await parquetWriter({parquetSchema: schema, typedArray: typed_array}, "src/test/result/test_nested.parquet")
    });

    test('inferSchema: should handle recursive nested objects', async() => {
        const typed_array2 = typeArray(nested_array2);
        const schema2 = inferSchema(typed_array2);
        await parquetWriter({parquetSchema: schema2, typedArray: typed_array2}, "src/test/result/test_nested_array.parquet")
    });


});