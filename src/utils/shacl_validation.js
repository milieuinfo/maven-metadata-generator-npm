import rdf from '@zazuko/env-node'
import SHACLValidator from 'rdf-validate-shacl'
import jp from "jsonpath";


const writerOptions = {
    frame : {
        "@context": {
            "graph": "@graph",
            "_type" : "@type",
            "_id": "@id",
            "type": {
                "@id": "http://www.w3.org/1999/02/22-rdf-syntax-ns#type",
                "@type": "@id"
            },
            "conforms": {
                "@id": "http://www.w3.org/ns/shacl#conforms",
                "@type": "http://www.w3.org/2001/XMLSchema#boolean"
            },
            "focusNode": {
                "@id": "http://www.w3.org/ns/shacl#focusNode",
                "@type": "@id"
            },
            "result": {
                "@id": "http://www.w3.org/ns/shacl#result",
                "@type": "@id"
            },
            "resultMessage": {
                "@id": "http://www.w3.org/ns/shacl#resultMessage"
            },
            "resultPath": {
                "@id": "http://www.w3.org/ns/shacl#resultPath",
                "@type": "@id"
            },
            "resultSeverity": {
                "@id": "http://www.w3.org/ns/shacl#resultSeverity",
                "@type": "@id"
            },
            "sourceConstraintComponent": {
                "@id": "http://www.w3.org/ns/shacl#sourceConstraintComponent",
                "@type": "@id"
            },
            "sourceShape": {
                "@id": "http://www.w3.org/ns/shacl#sourceShape",
                "@type": "@id"
            },
            "value": {
                "@id": "http://www.w3.org/ns/shacl#value",
                "@type": "@id"
            }
        },
        "@type": ["http://www.w3.org/ns/shacl#ValidationResult"],
    }
}

/**
 * Validates RDF
 * @async
 * @function validate
 * @param {Dataset} shapesDataset - SHACL shapes for validating the RDF
 * @param {rdf.Dataset} dataSet - RDF input as string
 * @returns {Promise<ValidationReport>} .
 * @throws {Error} - If Dataset validation failed.
 */
async function validate(shapesDataset, dataSet) {
    let report;
    const validator = new SHACLValidator(shapesDataset, { factory: rdf })
    try {
        report = await validator.validate(dataSet)
    } catch (err) {
        throw new Error(`Dataset validation failed: ${err.message}`);
    }
    report.writerOptions = writerOptions
    // Check conformance: `true` or `false`
    console.log('Dataset valid: ' + report.conforms)
    return report;
}
export default validate

