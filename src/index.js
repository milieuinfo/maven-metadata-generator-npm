import N3 from 'n3';
import fs from "fs";
import rdfDataset from "@rdfjs/dataset";
import validate from './utils/shacl_validation.js';
import jsonld from "jsonld";
import request from "request";
import path from "path";
import {RoxiReasoner} from "roxi-js";

import {
    artifactId,
    config,
    dcat_catalog_jsonld,
    dcat_catalog_turtle,
    dcat_dataset_jsonld,
    dcat_dataset_turtle,
    dcat_rules,
    frame_catalog,
    groupId,
    next_release_version,
    shapes_dcat
} from './utils/variables.js';
import {construct_dcat} from './utils/metadata.js';
import {joinArray, separateString, sortLines} from './utils/functions.js';


async function create_metadata() {
    console.log('1. get previous versions');
    let url = 'https://repo.omgeving.vlaanderen.be/artifactory/api/search/gavc?g=' +
        groupId +
        '&a=' +
        artifactId +
        '&classifier=sources&repos=release'
    let options = {json: true};
    request(url, options, (error, res, body) => {
        if (error) {
            return  console.log(error)
        };
        if (!error && res.statusCode == 200) {
            let my_uris = new Array();
            var re = new RegExp("^.*pom$");
            for (const result of body.results) {
                if (re.test(result.uri)){
                    my_uris.push(result.uri);
                }
            }
            get_versions(my_uris)
        };
    });
}

async function get_versions(uris) {
    let my_versions = new Array();
    for (const url of uris) {
        const object = {};
        const response = await fetch(url);
        const data = await response.json();
        object[version_from_uri(url)] = data.lastModified
        my_versions.push(object)
    }
    var date_time = new Date();
    let version = {}
    version[next_release_version] = date_time.toISOString()
    my_versions.push(version)
    const version_nt = await n3_reasoning(construct_dcat([version]), dcat_rules)
    const versions_nt = await n3_reasoning(construct_dcat(my_versions), dcat_rules)
    output(version_nt, dcat_dataset_turtle, dcat_dataset_jsonld)
    output(versions_nt, dcat_catalog_turtle, dcat_catalog_jsonld)
}


async function n3_reasoning(json_ld, rules) {
    console.log("2: n3 reasoning ");
    let rdf = await jsonld.toRDF(json_ld, { format: "application/n-quads" })
    const reasoner = RoxiReasoner.new();
    reasoner.add_abox(rdf);
    for (let rule in rules) {
        reasoner.add_rules(fs.readFileSync(rules[rule], 'utf8'));
    }
    reasoner.materialize();
    return await sortLines(reasoner.get_abox_dump());
}

//
//
// async function n3_reasoning(json, turtle, json_ld) {
//     console.log("4: n3 reasoning ");
//     let rdf = await jsonld.toRDF(json, { format: "application/n-quads" })
//     const reasoner = RoxiReasoner.new();
//     reasoner.add_abox(rdf);
//     reasoner.add_rules(dcat_rules);
//     reasoner.add_rules(dcterms_rules);
//     reasoner.add_rules(skos_rules);
//     reasoner.add_rules(foaf_rules);
//     reasoner.add_rules(void_rules);
//     reasoner.add_rules(rdf_rules);
//     reasoner.add_rules(spdx_rules);
//     reasoner.add_rules(spdx_extra_rules);
//     reasoner.materialize();
//     output(sortLines(reasoner.get_abox_dump()), turtle, json_ld);
// }


function output(rdf, turtle = false, json_ld = false, n_triples = false , csv = false) {
    console.log("5: output");
    const ttl_writer = new N3.Writer({ format: 'text/turtle' , prefixes: config.prefixes });
    const nt_writer = new N3.Writer({ format: 'N-Triples' });
    const dataset = rdfDataset.dataset()
    const parser = new N3.Parser();
    parser.parse(
        rdf,
        (error, quad) => {
            if (quad)
                ttl_writer.addQuad(quad),
                    nt_writer.addQuad(quad),
                    dataset.add(quad);
            else
                (async () => {
                    if (await validate(shapes_dcat, dataset)) {
                        if (turtle){
                            if (!fs.existsSync(path.dirname(turtle))){
                                fs.mkdirSync(path.dirname(turtle), { recursive: true });
                            }
                            ttl_writer.end((error, result) => fs.writeFileSync(turtle, result));
                        }
                        if (n_triples){
                            if (!fs.existsSync(path.dirname(n_triples))){
                                fs.mkdirSync(path.dirname(n_triples), { recursive: true });
                            }
                            nt_writer.end((error, result) => fs.writeFileSync(n_triples, result))
                        }
                        if (json_ld){
                            rdf_to_jsonld(dataset, json_ld);
                        }
                    }
                })()
        });
}


async function rdf_to_jsonld(rdf_dataset, filename) {
    console.log("6 rdf to jsonld");
    let my_json = await jsonld.fromRDF(rdf_dataset);
    console.log("Extract Catalog as a tree using a frame.");
    let framed = await jsonld.frame(my_json, frame_catalog);
    fs.writeFileSync(filename, JSON.stringify(framed, null, 4));
}

function version_from_uri(uri) {
    return uri.replace(/.*-(.*).pom$/, "$1")
}

export { n3_reasoning, create_metadata, separateString, joinArray, sortLines , validate };



//get_version_urls()


