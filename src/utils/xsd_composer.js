import jsonld from "jsonld";
import jp from "jsonpath";
import XMLWriter from "xml-writer";
import XmlBeautify from "xml-beautify";
import {DOMParser} from "xmldom";
import {RoxiReasoner} from "roxi-js";

async function xsd_composer(rdf_dataset, urn) {
    let my_json = await jsonld.fromRDF(rdf_dataset);
    identifier_present(my_json)
    let schema = jp.query(my_json, '$[?(@.@type[0]=="http://www.w3.org/2004/02/skos/core#ConceptScheme")]["http://purl.org/dc/elements/1.1/identifier"]')[0][0]['@value'];
    let concepts = jp.query(my_json, '$[?(@.@type[0]=="http://www.w3.org/2004/02/skos/core#Concept")]["@id"]');
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

async function identifier_present(json_ld) {
    const regexp_ns = new RegExp('^[a-z]*|[A-Z]*$')
    let regex = /^"[a-zA-Z0-9.]+"$/;

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
    //regex.test(id);
    if (!regex.test(id)) {
        throw new Error("The value of attribute 'name' on element 'xs:simpleType' is not valid with respect to its type, 'NCName'.");
    }
    return id;
}

export { xsd_composer, identifier_present };