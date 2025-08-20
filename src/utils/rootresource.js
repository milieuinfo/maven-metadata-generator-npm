import {RoxiReasoner} from "roxi-js";
import fs from "fs";


/**
 * Extracts uri's of ConceptSchemes from the source n-triple distribution.
 * @param {string} file_path - N-triple distribution file path.
 * @returns {Array<string>} - Array van ConceptScheme uri's.
 * @throws {Error} - If no schema uri is found.
 */
function getSchemas(file_path) {
    let schemas = []

        var query = `SELECT ?schema where {?schema a <http://www.w3.org/2004/02/skos/core#ConceptScheme>}`;
        const nt = fs.readFileSync(file_path, 'utf8')
        const reasoner = RoxiReasoner.new();
        reasoner.add_abox(nt);
        for (const row of reasoner.query(query)) {
            for (const binding of row) {
                schemas.push(binding.getValue().replace('<', '').replace('>', ''))
            }
        }
        if (!schemas[0]) {
            throw new Error('No Conceptscheme found');
        }

    return schemas;
}

export { getSchemas };