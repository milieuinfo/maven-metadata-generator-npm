import {Parser, Store, DataFactory} from "n3";
import fs from "fs";


/**
 * Extracts uri's of ConceptSchemes from the source n-triple distribution.
 * @param {string} file_path - N-triple distribution file path.
 * @returns {Array<string>} - Array van ConceptScheme uri's.
 * @throws {Error} - If no schema uri is found.
 */
function getSchemas(file_path) {
    let schemas = []

    const nt = fs.readFileSync(file_path, 'utf8')
    const store = new Store(new Parser().parse(nt));
    for (const schema of store.getSubjects(
        DataFactory.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
        DataFactory.namedNode('http://www.w3.org/2004/02/skos/core#ConceptScheme'),
        null)) {
        schemas.push(schema.value)
    }
    if (!schemas[0]) {
        throw new Error('No Conceptscheme found');
    }

    return schemas;
}

export { getSchemas };