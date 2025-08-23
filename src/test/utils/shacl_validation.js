import validate from "../../utils/shacl_validation.js";
import {describe, it, test} from 'node:test' ;
import assert from "node:assert";
import N3 from 'n3';
import rdfDataset from "@rdfjs/dataset";
import fs from "fs";
import rdf from "@zazuko/env-node";
import { json_writer, parquet_writer } from '../../utils/writers.js';


describe('Validate Datasets: rdf from "@zazuko/env-node" vs. rdfDataset from "@rdfjs/dataset"', async () => {
    describe('rdfDataset from "@rdfjs/dataset", the Ruben Verborgh way.\n dataSet.constructor.name === \'DatasetCore\'', async () => {
        const dataset = rdfDataset.dataset();
        const parser = new N3.Parser();
        await new Promise((resolve, reject) => {
            parser.parse(fs.readFileSync('src/test/sources/skos.nt', 'utf8'), (error, quad) => {
                if (error) return reject(error);
                if (quad) {
                    dataset.add(quad);
                } else {
                    resolve();
                }
            });
        });

        const skosrandom200dataset = rdfDataset.dataset();
        const parser2 = new N3.Parser();
        await new Promise((resolve, reject) => {
            parser2.parse(fs.readFileSync('src/test/sources/skosrandom200.nt', 'utf8'), (error, quad) => {
                if (error) return reject(error);
                if (quad) {
                    skosrandom200dataset.add(quad);
                } else {
                    resolve();
                }
            });
        });

        const shapesDataset = rdfDataset.dataset();
        const parser3 = new N3.Parser();
        await new Promise((resolve, reject) => {
            parser3.parse(fs.readFileSync('src/test/sources/shacl.ttl', 'utf8'), (error, quad) => {
                if (error) return reject(error);
                if (quad) {
                    shapesDataset.add(quad);
                } else {
                    resolve();
                }
            });
        });

        it('should validate skos rdf with the appropriate shacl file', async () => {
            const {report} = await validate(shapesDataset, dataset)
            const valid = report.conforms
            assert.strictEqual(valid, true);
        });
        test('should not validate skos rdf with the appropriate shacl file', async () => {
            const {report} = await validate(shapesDataset, skosrandom200dataset)
            const valid = report.conforms
            assert.strictEqual(valid, false);
        });

        it('should throw an error for invalid input', async function () {
            await assert.rejects(
                async () => {
                    await validate(shapesDataset, true);
                },
                TypeError, 'Invalid input: dataSet must be a DatasetCore.'
            );
        });
        it('should throw an error for invalid input for a wrong object', async function () {
            await assert.rejects(
                async () => {
                    await validate(shapesDataset, {test: 1});
                },
                TypeError, 'Invalid input: dataSet must be a DatasetCore.'
            );
        });
        it('should throw an error for invalid input for a string', async function () {
            await assert.rejects(
                async () => {
                    await validate('een string', dataset);
                },
                TypeError, 'Invalid input: shapesDataset must be a DatasetCore.'
            );
        });
        it('should throw an error for invalid input for a wrong object', async function () {
            await assert.rejects(
                async () => {
                    await validate( {test: 1}, dataset);
                },
                TypeError, 'Invalid input: shapesDataset must be a DatasetCore.'
            );
        });
    });
    describe('rdf from "@zazuko/env-node", the easy way.\n dataSet.constructor.name === \'Dataset\'', async () => {

        const shapesDataset = await rdf.dataset().import(rdf.fromFile('src/test/sources/shacl.ttl'))
        const dataset = await rdf.dataset().import(rdf.fromFile('src/test/sources/skos.nt'))
        const skosrandom200dataset = await rdf.dataset().import(rdf.fromFile('src/test/sources/skosrandom200.nt'))
        const parameter_norm = dataset.filter(q => q.subject.value === "https://data.omgeving.vlaanderen.be/id/concept/luchtzuiveringssysteem/parameter_norm/4")

        it('should not validate a skos concept without the definition of the scheme', async () => {
            const {report} = await validate(shapesDataset, parameter_norm)
            const valid = report.conforms
            assert.strictEqual(valid, false);
        });
        it('should validate skos rdf with the appropriate shacl file', async () => {
            const {report} = await validate(shapesDataset, dataset)
            const valid = report.conforms
            assert.strictEqual(valid, true);
        });
        test('should not validate skos rdf with the appropriate shacl file', async () => {
            const {report} = await validate(shapesDataset, skosrandom200dataset)
            const valid = report.conforms
            assert.strictEqual(valid, false);
        });
        test('should write a report file when the rdf is not valid', async () => {
            const {report, writerOptions} = await validate(shapesDataset, parameter_norm)
            await fs.rmSync("src/test/result/validation_result.json", {force: true});
            await fs.rmSync("src/test/result/validation_result.parquet", {force: true});
            assert(!fs.existsSync("src/test/result/validation_result.json"))
            assert(!fs.existsSync("src/test/result/validation_result.parquet"))
            await json_writer(report.dataset, {
                file: 'src/test/result/validation_result.json',
                frame: writerOptions.frame
            });
            await parquet_writer(report.dataset, {
                file: 'src/test/result/validation_result.parquet',
                frame: writerOptions.frame
            });
            assert(fs.existsSync("src/test/result/validation_result.json"))
            assert(fs.existsSync("src/test/result/validation_result.parquet"))
        });
        it('should throw an error for invalid input for a string', async function () {
            await assert.rejects(
                async () => {
                    await validate(shapesDataset, 'een string');
                },
                TypeError, 'Invalid input: dataSet must be a DatasetCore.'
            );
        });
        it('should throw an error for invalid input for a wrong object', async function () {
            await assert.rejects(
                async () => {
                    await validate(shapesDataset, {test: 1});
                },
                TypeError, 'Invalid input: dataSet must be a DatasetCore.'
            );
        });
        it('should throw an error for invalid input for a string', async function () {
            await assert.rejects(
                async () => {
                    await validate('een string', dataset);
                },
                TypeError, 'Invalid input: shapesDataset must be a DatasetCore.'
            );
        });
        it('should throw an error for invalid input for a wrong object', async function () {
            await assert.rejects(
                async () => {
                    await validate( {test: 1}, dataset);
                },
                TypeError, 'Invalid input: shapesDataset must be a DatasetCore.'
            );
        });


    });
})
