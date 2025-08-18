import fs from "fs";
import {xsd_composer} from './xsd_composer.js';

/**
 * Writes an XSD file generated from the given RDF dataset and options.
 *
 * @async
 * @function xsd_writer
 * @param {any} rdf_dataset - The RDF dataset to be transformed into XSD.
 * @param {Object} xsdOptions - Options for XSD generation.
 * @param {string} xsdOptions.file - The file path where the generated XSD will be written.
 * @param {string} xsdOptions.urn - The URN to be used for XSD composition.
 * @returns {Promise<void>} A promise that resolves when the file is written.
 * @throws Will log an error message to the console if writing fails.
 */
async function xsd_writer(rdf_dataset, xsdOptions) {
    try {
        fs.writeFileSync(xsdOptions.file, await xsd_composer(rdf_dataset, xsdOptions.urn), 'utf8' );
    }
    catch(e) {
        console.log(e.message);
    }
}

export { xsd_writer };