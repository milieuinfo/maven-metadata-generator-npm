import jsonld from "jsonld";
import jp from "jsonpath";
import XMLWriter from "xml-writer";
import XmlBeautify from "xml-beautify";
import {DOMParser} from "xmldom";
import {RoxiReasoner} from "roxi-js";
import rdf from '@rdfjs/dataset';
import { Parser } from 'n3';




/**
 * Composes an XML Schema Definition (XSD) as a string from an RDF dataset and a URN.
 *
 * This function parses the given RDF dataset into JSON-LD, ensures that the ConceptScheme
 * has a valid identifier and that the URN matches the required pattern. It then queries
 * all SKOS concepts belonging to the target ConceptScheme and generates a simple XSD enumeration
 * of their identifiers. The resulting XSD string is beautified for readability.
 *
 * @async
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset | string} rdf_dataset - The RDF dataset in a serialization compatible with jsonld.fromRDF (e.g., N-Quads, DatasetCore). RDF input to be transformed into XSD.
 * @param {string} urn - The target namespace URN for the XSD schema. Must follow the urn pattern.
 * @returns {Promise<string>} A promise that resolves to the beautified XSD schema as a string.
 * @throws {TypeError} - If data is not a Dataset or DatasetCore or not text rdf that can be converted to a Dataset.
 * @throws {Error} If the ConceptScheme does not have an identifier, the identifier is not a valid NCName,
 *                 or the URN does not match the required pattern.
 */
async function xsd_composer(rdf_dataset, urn) {
    if (typeof rdf_dataset !== 'object' || !(rdf_dataset && 'match' in rdf_dataset && 'add' in rdf_dataset) ) {
        if (!('add' in rdf.dataset(new Parser({ format: 'N-Triples' }).parse(rdf_dataset)))) {
            throw new TypeError('Invalid input: data must be a DatasetCore.');
        }
    }
    let my_json = await jsonld.fromRDF(rdf_dataset);
    identifier_present(my_json)
    has_correct_urn_pattern(urn)
    let schema = jp.query(my_json, '$[?(@.@type[0]=="http://www.w3.org/2004/02/skos/core#ConceptScheme")]["http://purl.org/dc/elements/1.1/identifier"]')[0][0]['@value'];
    let targetSchemeId = jp.query(my_json, '$[?(@.@type[0]=="http://www.w3.org/2004/02/skos/core#ConceptScheme")]["@id"]')[0]
    let concepts = []
    for ( let item of my_json) {
        try {
            if ( item["http://www.w3.org/2004/02/skos/core#inScheme"][0]['@id'] === targetSchemeId ){
                concepts.push(item['@id'])
            }
        } catch (error) {}
    }
    var xw = new XMLWriter;
    xw.startDocument('1.0', 'UTF-8');
    xw.startElement('xs:schema');
    xw.writeAttribute('xmlns:xs', 'http://www.w3.org/2001/XMLSchema');
    xw.writeAttribute('targetNamespace', urn);
    xw.startElement('xs:simpleType');
    xw.writeAttribute('name', schema);
    xw.startElement('xs:restriction');
    xw.writeAttribute('base', 'xs:string');
    concepts.forEach(function(concept){
        xw.startElement('xs:enumeration');
        xw.writeAttribute('value', concept);
        xw.endElement('xs:enumeration');
    });
    xw.endElement('xs:restriction');
    xw.endElement('xs:simpleType');
    xw.endElement('xs:schema');
    xw.endDocument();
    const beautifiedXmlText = new XmlBeautify({ parser: DOMParser }).beautify(xw.toString(),{
        indent: "  ",
        useSelfClosingElement: true
    });
    return await beautifiedXmlText;
}
function identifier_is_valid_ncname(id) {
    let regex = /^"*[a-zA-Z0-9\\.]+"*$/
    if (!regex.test(id)) {
        throw new Error("The value of attribute 'name' on element 'xs:simpleType' is not valid with respect to its type, 'NCName'.");
    }
    return true;
}
function has_correct_urn_pattern(urn) {
    let regex = /^"*urn:[a-zA-Z0-9\\.:-]+"*$/
    if (!regex.test(urn)) {
        throw new Error("TargetNamespace doesn't have a correct urn pattern.");
    }
    return true;
}

/**
 * Checks if a ConceptScheme has a valid dc:identifier and returns it.
 * @param {Object} json_ld - JSON-LD object to process.
 * @returns {Promise<string>} - The valid identifier.
 * @throws {Error} - If no valid identifier is found or validation fails.
 */
async function identifier_present(json_ld) {
    var query = `SELECT ?identifier where {?s a <http://www.w3.org/2004/02/skos/core#ConceptScheme> ; <http://purl.org/dc/elements/1.1/identifier> ?identifier}  `;
    const nt = await jsonld.toRDF(json_ld, { format: "application/n-quads" })
    const reasoner = RoxiReasoner.new();
    reasoner.add_abox(nt);
    let id = false
    for (const row of reasoner.query(query)) {
        for (const binding of row) {
            id = binding.getValue()
        }
    }
    if (!id) {
        throw new Error('Conceptscheme without dc:identifier');
    }
    identifier_is_valid_ncname(id)
    return id;
}

export { xsd_composer, identifier_present, identifier_is_valid_ncname, has_correct_urn_pattern };