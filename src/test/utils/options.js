// import {test, describe, it} from 'node:test' ;
// import assert from "node:assert";
// import rdf from "@zazuko/env-node";
// import {generate_skos, output} from "../../index.js";
//
//
//
// describe("async function generate_skos(options) requires at least one output option.", () => {
//     it('should throw a type error when options is not an object', async () => {
//         assert.throws(
//             () => generate_skos('foo'),
//             TypeError,
//             'Expected an object'
//         );
//     });
//     it('should throw an error when not at least one outputoption is specified.', async () => {
//         assert.throws(
//             () => generate_skos({"a": "b"}),
//             Error,
//             'Invalid options: no specified output.'
//         );
//     });
// });
//
// describe("async function output(shapes, rdf, options) requires at least one output option, a shacl shape and rdf as text.", () => {
//
//     it('should throw a type error when options is not an object', async () => {
//         const shapes = await rdf.dataset().import(rdf.fromFile('../sources/shacl.ttl'))
//         const my_rdf = await rdf.dataset().import(rdf.fromFile('../sources/skos.nt'))
//         assert.throws(
//             () => generate_skos('foo'),
//             TypeError,
//             'Expected an object'
//         );
//     });
//     it('should throw an error when not at least one outputoption is specified.', async () => {
//         assert.throws(
//             () => generate_skos({"a": "b"}),
//             Error,
//             'Invalid options: no specified output.'
//         );
//     });
// });