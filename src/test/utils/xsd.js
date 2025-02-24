import N3 from 'n3';
import {describe, test} from "node:test";
import assert from "node:assert";
import { json_ld, json_ld_error, json_ld_error2 } from './variables.js' ;
import jsonld from "jsonld";
import {xsd_composer,identifier_present, identifier_is_valid_ncname, has_correct_urn_pattern} from "../../utils/xsd_composer.js";
import rdfDataset from "@rdfjs/dataset";

async function json_ld_to_dataset(my_json_ld){
    let my_rdf = await jsonld.toRDF(my_json_ld, { format: "application/n-quads" })
    const dataset = rdfDataset.dataset()
    const parser = new N3.Parser();
    await parser.parse(
        my_rdf,
        (error, quad) => {
            if (quad)
                dataset.add(quad);
        });
    return dataset;
}

describe("Convert jsonld to xsd.", (s) => {
    const groupId = 'be.vlaanderen.omgeving.data.id.graph';
    const artifactId = 'codelijst-gebouw';
    const urn = ('urn:' + groupId + ':' + artifactId);


    test('Test targetNamespace has a correct urn pattern.', async (t) => {
        assert.strictEqual(has_correct_urn_pattern("urn:be.vlaanderen.bodemenondergrond.data.id.graph:codelijst-tektoniektype"), true)
        try {
            await has_correct_urn_pattern('be.vlaanderen.bodemenondergrond.data.id.graph:codelijst-tektoniektype')}
        catch (e) {
            assert.strictEqual(e.message, "TargetNamespace doesn't have a correct urn pattern.")
        }
        try {
            await has_correct_urn_pattern('https://data.omgeving.vlaanderen.be/id/graph/codelijst-tektoniektype')}
        catch (e) {
            assert.strictEqual(e.message, "TargetNamespace doesn't have a correct urn pattern.")
        }
    });

    test('Test Conceptscheme without dc:identifier.', async (t) => {
        try {
            await identifier_present(json_ld_error)}
        catch (e) {
            assert.strictEqual(e.message, "Conceptscheme without dc:identifier")
        }
    });

    test("The value of attribute 'name' on element 'xs:simpleType' is valid with respect to its type, 'NCName'.", async (t) => {
        try {
            await identifier_present(json_ld_error2)}
        catch (e) {
            assert.strictEqual(e.message, "The value of attribute 'name' on element 'xs:simpleType' is not valid with respect to its type, 'NCName'.")
        }
        try {
            await identifier_is_valid_ncname("urn:be.vlaanderen.omgeving.data.id.conceptscheme.gebouw")}
        catch (e) {
            assert.strictEqual(e.message, "The value of attribute 'name' on element 'xs:simpleType' is not valid with respect to its type, 'NCName'.")
        }
        try {
            await identifier_is_valid_ncname("https://data.omgeving.vlaanderen.be/id/concept/gebouw/buitenmuur")}
        catch (e) {
            assert.strictEqual(e.message, "The value of attribute 'name' on element 'xs:simpleType' is not valid with respect to its type, 'NCName'.")
        }
        assert.strictEqual(identifier_is_valid_ncname("be.vlaanderen.omgeving.data.id.conceptscheme.gebouw"), true)
    });

    test('Test xsd composer.', async (t) => {
        const dataset = await json_ld_to_dataset(json_ld)
        assert.strictEqual(await xsd_composer(dataset, urn), "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
            "<xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" targetNamespace=\"urn:be.vlaanderen.omgeving.data.id.graph:codelijst-gebouw\">\n" +
            "  <xs:simpleType name=\"be.vlaanderen.omgeving.data.id.conceptscheme.gebouw\">\n" +
            "    <xs:restriction base=\"xs:string\">\n" +
            "      <xs:enumeration value=\"https://data.omgeving.vlaanderen.be/id/concept/gebouw/buitenmuur\" />\n" +
            "      <xs:enumeration value=\"https://data.omgeving.vlaanderen.be/id/concept/gebouw/schoorsteen\" />\n" +
            "    </xs:restriction>\n" +
            "  </xs:simpleType>\n" +
            "</xs:schema>\n")
    });

    test('codedlist has a conceptscheme definition with a dc.identifier field.', async (t) => {
        assert.strictEqual(await identifier_present(json_ld), '"be.vlaanderen.omgeving.data.id.conceptscheme.gebouw"')
    });
});