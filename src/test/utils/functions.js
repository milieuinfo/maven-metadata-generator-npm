import {
    separateString,
    jsonld_to_table
} from '../../utils/functions.js';
import { json_ld, succes_frame, fail_frame } from './variables.js' ;
import {test, describe, it} from 'node:test' ;
import assert from "node:assert";
import jsonld from 'jsonld';


describe("Pipe separated string to array", () => {
    test("For properties with a cardinality '|A| > 1', a pipe separated string is used in the source csv. " +
        "In the csv to json step, during the transformation from source csv to rdf, each value of the sourcwe csv is checked. " +
        "For pipe separated values a array is returned, for values without the pipe symbol the original value is returned.", () => {
        //Act
        const pipe_separated_string = 'a|b|c'
        const returned_array = separateString(pipe_separated_string);
        const pipe_separated_string2 = 'a\|b\|c'
        const returned_array2 = separateString(pipe_separated_string2);
        const string = 'test string'
        const returned_string = separateString(string)
        const boolean = false
        const returned_boolean = separateString(boolean)
        const number = 33
        const returned_number = separateString(number)
        //Assert
        assert(returned_array[0] === "a")
        assert(returned_array[1] === "b")
        assert(returned_array[2] === "c")
        assert(returned_array[2] === returned_array2[2])
        assert(returned_array.length === 3)
        assert(typeof string === typeof returned_string)
        assert(typeof returned_string === "string")
        assert(typeof returned_boolean === "boolean")
        assert(typeof returned_number === "number")
        assert(typeof returned_array === "object")
        assert(typeof returned_array2 === "object")
    });
});


describe("Reading and writing tabular data (csv) to and from json-ld. Convert pipe separated string values to json array and vice-versa", (s) => {
    test('Separate string.', async (t) => {
        await t.test("For properties with a cardinality '|A| > 1', a pipe separated string is used in the source csv. " +
            "In the csv to json step, during the transformation from source csv to rdf, each value of the sourcwe csv is checked. " +
            "For pipe separated values a array is returned, for values without the pipe symbol the original value is returned.", (t) => {
            const pipe_separated_string = 'a|b|c'
            const pipe_separated_string2 = 'a\|b\|c'
            const string = 'test string'
            const boolean = false
            const number = 33
            assert.strictEqual(separateString(pipe_separated_string)[0], "a");
            assert.strictEqual(separateString(pipe_separated_string)[1], "b");
            assert.strictEqual(separateString(pipe_separated_string)[2], "c");
            assert.strictEqual(separateString(pipe_separated_string)[2], separateString(pipe_separated_string2)[2]);
            assert.strictEqual(separateString(pipe_separated_string).length, 3);
            assert.strictEqual(typeof string, typeof separateString(string));
            assert.strictEqual(typeof separateString(string), "string");
            assert.strictEqual(typeof separateString(boolean), "boolean");
            assert.strictEqual(typeof separateString(number), "number");
            assert.strictEqual(typeof separateString(pipe_separated_string), "object");
            assert.strictEqual(typeof separateString(pipe_separated_string2), "object");
            assert.strictEqual(Array.isArray(separateString(pipe_separated_string)), true);
        });
    });
    test('Converting jsonld to csv requires ' +
        '1) a `flat` json in the @graph part. This is obtained by providing a suited @context and a suited frame to transform the jsonld.' +
        '2) selecting the content of the @graph part. ' +
        '3) converting keys to column headers and converting arrays to pipe separated strings with the "joinArray" function.', async (t) => {
        var my_jsonld = await jsonld.frame(json_ld, succes_frame)
        const array = await jsonld_to_table(my_jsonld)
        await t.test("Succes scenario for jsonld to csv transformation", (t) => {
            assert.strictEqual(separateString(array.sort()[0].member).length, 2);
        });
        var my_jsonld_nesting = await jsonld.frame(json_ld, fail_frame)
        // TODO: real await jsonld_to_table(my_jsonld_nesting)
        await t.test("Fail scenario for jsonld to csv transformation, members van de collectie zijn genest. " +
            "=> await jsonld_to_table(my_jsonld_nesting) triggers process.exit(1)", (t) => {
            assert.strictEqual(my_jsonld_nesting["graph"].sort()[0].member.length, 2);

        });
    });

});