import rdf from '@zazuko/env-node'
import SHACLValidator from 'rdf-validate-shacl'
import {cleanUpDir} from "./functions.js";
import {json_writer, parquet_writer} from "./writers.js";


const writerOptions = {
    frame : {
        "@context": {
            "graph": "@graph",
            "_type" : "@type",
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
            "inversePath": {
                "@id": "http://www.w3.org/ns/shacl#inversePath",
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
        "@type": ["http://www.w3.org/ns/shacl#ValidationResult", "http://www.w3.org/ns/shacl#ValidationReport"],
        "result": {
            "@embed": "@never",
            "@omitDefault": true
        }
    }
}

/**
 * Validates RDF
 *
 * @async
 * @function validate
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} shapesDataset - SHACL shapes for validating the RDF
 * @param {import('@rdfjs/types').DatasetCore | import('@rdfjs/types').Dataset} dataSet - RDF input as a dataset
 * @param {{ parquetFile: string, jsonFile: string }} logFiles - Paths for writing the log files
 * @returns {SHACLValidator.ValidationReport}  report
 * @throws {Error} - If Dataset validation fails.
 * @throws {TypeError} - If shapesDataset is not a Dataset or DatasetCore.
 * @throws {TypeError} - If dataSet is not a Dataset or DatasetCore.
 */
async function validate(shapesDataset,
                        dataSet, logFiles =
                        { parquetFile : '../validation/validation_result.parquet',
                            jsonFile : '../validation/validation_result.json' }) {
    if (typeof shapesDataset !== 'object' || !(shapesDataset && 'match' in shapesDataset && 'add' in shapesDataset)) {
        throw new TypeError('Invalid input: shapesDataset must be a DatasetCore.');
    }
    if (typeof dataSet !== 'object' || !(dataSet && 'match' in dataSet && 'add' in dataSet)) {
        throw new TypeError('Invalid input: dataSet must be a DatasetCore.');
    }
    const validator = new SHACLValidator(shapesDataset, { factory: rdf });
    try {
        const report = await validator.validate(dataSet);
        if (!(report.conforms)) {
            console.error("Validation failed.");
            // Validation report as file
            cleanUpDir('../validation/')
            await parquet_writer(report.dataset, {file : logFiles.parquetFile, frame: writerOptions.frame});
            await json_writer(report.dataset, {file : logFiles.jsonFile, frame: writerOptions.frame});
        } else {
            console.error("Validation succeeded.");
        }
        return report

    } catch (err) {
        throw new Error(`Dataset validation failed: ${err.message}`);
    }
}


export default validate;

