import fs from "fs";
import XMLWriter from 'xml-writer';
import XmlBeautify from 'xml-beautify';
import { DOMParser } from 'xmldom';
import jsonld from "jsonld";
import jp from 'jsonpath';
import { urn } from './variables.js';

async function xsd_writer(rdf_dataset, xsd_file) {
    let my_json = await jsonld.fromRDF(rdf_dataset);
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
    fs.writeFileSync(xsd_file, beautifiedXmlText, 'utf8' );
}
export { xsd_writer };