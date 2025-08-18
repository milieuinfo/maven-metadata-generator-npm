import fs from "fs";
import {xsd_composer} from './xsd_composer.js';


async function xsd_writer(rdf_dataset, xsdOptions) {
    try {
        fs.writeFileSync(xsdOptions.file, await xsd_composer(rdf_dataset, xsdOptions.urn), 'utf8' );
    }
    catch(e) {
        console.log(e.message);
    }
}

export { xsd_writer };