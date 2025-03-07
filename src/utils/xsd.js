import fs from "fs";
import { urn } from './variables.js';
import {xsd_composer} from './xsd_composer.js';


async function xsd_writer(rdf_dataset, xsd_file) {
    try {
        fs.writeFileSync(xsd_file, await xsd_composer(rdf_dataset, urn), 'utf8' );
    }
    catch(e) {
        console.log(e.message);
    }
}

export { xsd_writer };