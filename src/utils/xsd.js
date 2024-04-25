import fs from "fs";
import XMLWriter from 'xml-writer';
import XmlBeautify from 'xml-beautify';
import { DOMParser } from 'xmldom';


async function xsd_writer(rdf_dataset, xsd_file) {
    let my_json = await jsonld.fromRDF(rdf_dataset);
    let schema = jp.query(my_json, '$[?(@.@type[0]=="http://www.w3.org/2004/02/skos/core#ConceptScheme")]["@id"]')[0];
    let concepts = jp.query(my_json, '$[?(@.@type[0]=="http://www.w3.org/2004/02/skos/core#Concept")]["@id"]');
    var xw = new XMLWriter;

    xw.startDocument('1.0', 'UTF-8');
    xw.startElement('xs:schema');
    xw.writeAttribute('xmlns:xs', 'http://www.w3.org/2001/XMLSchema');
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