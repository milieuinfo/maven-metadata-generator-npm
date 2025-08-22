import validate from "../../utils/shacl_validation.js";
import {describe, it, test} from 'node:test' ;
import assert from "node:assert";
import N3 from 'n3';
import rdfDataset from "@rdfjs/dataset";
import fs from "fs";
import rdf from "@zazuko/env-node";
import { json_writer, parquet_writer } from '../../utils/writers.js';
import {rdf_to_jsonld} from '../../utils/functions.js'
import {getSchemas} from "../../utils/rootresource.js";


describe('validate(shapesDataset, dataset)', async () => {
    const skos_filepath = 'src/test/sources/skos.nt'
    const skosrandom200_filepath = 'src/test/sources/skosrandom200.nt'
    const shacl_filepath = 'src/test/sources/shacl.ttl'
    const nt = fs.readFileSync(skos_filepath, 'utf8')
    const skosrandom200_nt = fs.readFileSync(skosrandom200_filepath, 'utf8')
    const dataset = rdfDataset.dataset();
    const parser = new N3.Parser();
    // Parse the RDF string, add quads to writers and dataset
    await new Promise((resolve, reject) => {
        parser.parse(nt, (error, quad) => {
            if (error) return reject(error);
            if (quad) {
                dataset.add(quad);
            } else {
                resolve(); // Parsing complete
            }
        });
    });
    const skosrandom200dataset = rdfDataset.dataset();
    const parser2 = new N3.Parser();
    // Parse the RDF string, add quads to writers and dataset
    await new Promise((resolve, reject) => {
        parser2.parse(skosrandom200_nt, (error, quad) => {
            if (error) return reject(error);
            if (quad) {
                skosrandom200dataset.add(quad);
            } else {
                resolve(); // Parsing complete
            }
        });
    });
    const shapesDataset =await rdf.dataset().import(rdf.fromFile(shacl_filepath))
    it('should validate skos rdf with the appropriate shacl file', async () => {
        const report = await validate(shapesDataset, dataset)
        const valid = report.conforms
        assert.strictEqual(valid, true);
    });
    test('should not validate skos rdf with the appropriate shacl file', async() => {
        const report = await validate(shapesDataset, skosrandom200dataset)
        const valid = report.conforms
        assert.strictEqual(valid, false);
    });
    test('should write a report file when the rdf is not valid', async() => {
        const report = await validate(shapesDataset, skosrandom200dataset)
        await fs.rmSync("src/test/result/validation_result.json", { force: true });
        await fs.rmSync("src/test/result/validation_result.parquet", { force: true });
        assert(!fs.existsSync("src/test/result/validation_result.json"))
        assert(!fs.existsSync("src/test/result/validation_result.parquet"))
        await json_writer(report.dataset, {file : 'src/test/result/validation_result.json', frame: report.writerOptions.frame});
        await parquet_writer(report.dataset, {file : 'src/test/result/validation_result.parquet', frame: report.writerOptions.frame});
        assert(fs.existsSync("src/test/result/validation_result.json"))
        assert(fs.existsSync("src/test/result/validation_result.parquet"))
    });
    test('should throw Error if dataset is not correct.', async() => {
        assert.throws(
            () =>
                validate(shapesDataset, 'een string'),
            TypeError,
            'Dataset validation failed: dataGraph.dataset.match is not a function or its return value is not iterable');
    });

});