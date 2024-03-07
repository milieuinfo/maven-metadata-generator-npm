'use strict';
import yaml from 'js-yaml';
import fs, {readFileSync} from "fs";
import rdf from "@zazuko/env-node";
import convert from "xml-js";
import jp from "jsonpath";

const this_config = yaml.load(fs.readFileSync(process.cwd() + '/../node_modules/maven-metadata-generator-npm/src/config/config.yml', 'utf8'));

const config = yaml.load(fs.readFileSync('./source/config.yml', 'utf8'));

const context = Object.assign({},JSON.parse(readFileSync(config.source.path + config.source.context)), config.prefixes)

const shapes_dcat = await rdf.dataset().import(rdf.fromFile(process.cwd() + this_config.ap.path))

const pom = JSON.parse(convert.xml2json(readFileSync(this_config.pom.path, 'utf8'), {compact: true, spaces: 4}));

const groupId = jp.query(pom, '$.project.groupId._text').toString();

const artifactId = jp.query(pom, '$.project.artifactId._text').toString();

const next_release_version = jp.query(pom, '$.project.version._text').toString().split('-')[0];

const dcat_rules = this_config.dcat.rules ;

const dcat_catalog_path = config.dcat.path_catalog + artifactId + '/'

const dcat_dataset_path = config.dcat.path_dataset + artifactId + '/'

const dcat_dataset_jsonld = dcat_dataset_path + config.dcat.dataset_jsonld

const dcat_dataset_turtle = dcat_dataset_path + config.dcat.dataset_turtle

const dcat_catalog_jsonld = dcat_catalog_path + config.dcat.catalog_jsonld

const dcat_catalog_turtle = dcat_catalog_path + config.dcat.catalog_turtle


const frame_catalog = {
    "@context": context,
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

export {
    artifactId,
    config,
    context,
    dcat_catalog_jsonld,
    dcat_catalog_path,
    dcat_catalog_turtle,
    dcat_dataset_jsonld,
    dcat_dataset_path,
    dcat_dataset_turtle,
    dcat_rules,
    frame_catalog,
    groupId,
    next_release_version,
    shapes_dcat
};



