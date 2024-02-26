'use strict';
import yaml from 'js-yaml';
import fs, {readFileSync} from "fs";
import rdf from "@zazuko/env-node";
import convert from "xml-js";
import jp from "jsonpath";


const config = yaml.load(fs.readFileSync('./source/config.yml', 'utf8'));



const context_catalog = Object.assign({},JSON.parse(readFileSync(config.source.path + config.source.context)), config.prefixes)


const shapes_dcat = await rdf.dataset().import(rdf.fromFile(config.ap.path + 'dcat-' + config.ap.type + '/' + 'dcat-' + config.ap.type + config.ap.turtle))

var result = JSON.parse(convert.xml2json(readFileSync('../pom.xml', 'utf8'), {compact: true, spaces: 4}));

const groupId = jp.query(result, '$.project.groupId._text').toString();

const artifactId = jp.query(result, '$.project.artifactId._text').toString();

const next_release_version = jp.query(result, '$.project.version._text').toString().split('-')[0];

const name = jp.query(result, '$.project.name._text').toString();


const skos_rules = fs.readFileSync(config.n3.skos_rules, 'utf8');

const dcat_rules = fs.readFileSync(config.n3.dcat_rules, 'utf8');

const dcterms_rules = fs.readFileSync(config.n3.dcterms_rules, 'utf8');

const foaf_rules = fs.readFileSync(config.n3.foaf_rules, 'utf8');

const void_rules = fs.readFileSync(config.n3.void_rules, 'utf8');

const rdf_rules = fs.readFileSync(config.n3.rdf_rules, 'utf8');

const spdx_rules = fs.readFileSync(config.n3.spdx_rules, 'utf8');

const spdx_extra_rules = fs.readFileSync(config.n3.spdx_extra_rules, 'utf8');


const frame_catalog = {
    "@context": context_catalog,
    "@type": ["dcat:Catalog"],
    "dataset": {
        "@embed": "@always",
        "@omitDefault": true,
        "hasVersion": {
            "@embed": "@always",
            "@omitDefault": true,
            "isVersionOf": {
                "@embed": "@never",
                "@omitDefault": true
            },
            "distribution": {
                "@embed": "@always",
                "@omitDefault": true
            }
        }
    }
}

const dcat_dataset_jsonld = config.dcat.path_dataset + name + '/' + config.dcat.dataset_jsonld

const dcat_dataset_turtle = config.dcat.path_dataset + config.dcat.name + '/' + config.dcat.dataset_turtle

const dcat_catalog_jsonld = config.dcat.path_catalog + config.dcat.name + '/' + config.dcat.catalog_jsonld

const dcat_catalog_turtle = config.dcat.path_catalog + config.dcat.name + '/' + config.dcat.catalog_turtle

const sortLines = str => str.split(/\r?\n/).sort().join('\n'); // To sort the dump of the reasoner for turtle pretty printing. Easier than using the Sink or Store.


export { sortLines, rdf_rules, spdx_rules, spdx_extra_rules, void_rules, foaf_rules, dcterms_rules, dcat_rules, skos_rules, dcat_dataset_jsonld, dcat_dataset_turtle, dcat_catalog_jsonld, dcat_catalog_turtle, groupId, artifactId,  next_release_version, name, config,   shapes_dcat,  context_catalog, frame_catalog };

