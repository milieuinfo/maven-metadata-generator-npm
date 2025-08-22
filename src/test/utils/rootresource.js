import { getSchemas } from "../../utils/rootresource.js";
import {describe, it, test} from 'node:test' ;
import assert from "node:assert";


describe('getSchemas(skos_filepath)', () => {
    it('should extract uri\'s of ConceptSchemes from the source n-triple distribution.', async () => {
        const skos_filepath = 'src/test/sources/skos.nt'
        const expected_schemas  = [
                "https://data.omgeving.vlaanderen.be/id/conceptscheme/lzs",
                "https://data.omgeving.vlaanderen.be/id/conceptscheme/lzs-param-norm",
                "https://data.omgeving.vlaanderen.be/id/conceptscheme/lzsm",
                "https://data.omgeving.vlaanderen.be/id/conceptscheme/lzsp",
                "https://data.omgeving.vlaanderen.be/id/conceptscheme/lzss",
                "https://data.omgeving.vlaanderen.be/id/conceptscheme/lzsst",
                "https://data.omgeving.vlaanderen.be/id/conceptscheme/norm_bandbreedte"
            ]
        const result_schemas = getSchemas(skos_filepath).sort()
        assert.strictEqual(
            expected_schemas[0],
            result_schemas[0]);
        assert.strictEqual(
            expected_schemas[6],
            result_schemas[6]);
        assert.strictEqual(
            expected_schemas[7],
            undefined);
    });
    test('should throw Error if rdf has no conceptscheme', () => {
        const skos_filepath = 'src/test/sources/skos_no_conceptscheme.nt'
        assert.throws(
            () =>
            getSchemas(skos_filepath),
            Error,
            'No Conceptscheme found');
    });

});