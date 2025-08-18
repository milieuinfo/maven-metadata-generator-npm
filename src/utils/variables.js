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

const skos_rules = config.skos.rules ;

const dcat_rules = this_config.dcat.rules ;

const skos_prefixes = Object.assign( {}, config.skos.prefixes, config.prefixes, { '@base' : config.skos.prefixes.concept })

const skos_context = JSON.parse(readFileSync(config.source.path + config.source.context));

const skos_context_prefixes = Object.assign({},skos_context , skos_prefixes)

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


const metadataOptions = {
    "artifactId": artifactId,
    "groupId": groupId,
    "next_release_version": next_release_version,
    "startVersion": config.metadata.start_version
}


export {
    frame_catalog,
    metadataOptions,
    artifactId,
    groupId,
    config,
    context,
    skos_context_prefixes,
    next_release_version,
    shapes_dcat,
    skos_rules,
    dcat_rules
};



