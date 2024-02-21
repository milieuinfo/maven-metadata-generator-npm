'use strict';
import yaml from 'js-yaml';
import fs, {readFileSync} from "fs";
import convert from "xml-js";
import jp from "jsonpath";
//import {context_skos_prefixes} from "./variables";


const config = yaml.load(fs.readFileSync('../resources/source/config.yml', 'utf8'));

var result = JSON.parse(convert.xml2json(readFileSync('../../../pom.xml', 'utf8'), {compact: true, spaces: 4}));

const groupId = jp.query(result, '$.project.groupId._text').toString();

const artifactId = jp.query(result, '$.project.artifactId._text').toString();

const context = Object.assign({},JSON.parse(readFileSync(config.source.path + config.source.context)), config.prefixes)


function construct_metadata(versions) {
    let dataset_versions = new Array()
    for (const v of versions) {
        for (const [version, date_time] of Object.entries(v)) {
            let distributions = new Array()
            for (const [extension, distribution_metadata] of Object.entries(config.metadata.distribution)) {
                let downloadURL = {}
                let distribution_object = {}
                let dist = {
                    "id": config.prefixes.omg_distribution + artifactId + '_' + version + '_' + extension,
                    "dc.identifier": groupId.replace("graph", 'distribution') + '.' + artifactId + '.' + version + '_' + extension,
                    "description": artifactId.split("-").join(' ') + ', geserialiseerd als ' + extension + ' bestand.',
                    "identifier": config.prefixes.omg_distribution + artifactId + '_' + version + '_' + extension,
                    "issued": date_time ,
                    "version": version,
                    "title": artifactId.split("-").join(' ') + ', geserialiseerd als ' + extension + '-formaat. Versie ' + version,
                    "page": config.prefixes.omg_distribution_doc + artifactId + '_' + version + '_' + extension + '.html'
                } //be/vlaanderen/omgeving/data/id/graph/codelijst-matrix/2.0.1/codelijst-matrix-2.0.1.jar
                if (extension === 'jar'){
                    distribution_object = Object.assign({},{
                        "downloadURL": config.prefixes.repo + groupId.replace("/", '.') + '/' + version + '/' + artifactId + '-' + version + '.' + extension,
                        "packageName" : groupId + '.' + artifactId
                    }, dist, config.metadata.all, distribution_metadata)
                } else {
                    distribution_object = Object.assign({},{
                        "downloadURL": config.prefixes.datasets + groupId.replace("graph", 'distribution') + '.' + artifactId + '.' + version + '_' + extension,
                    }, dist, config.metadata.all, distribution_metadata)
                }
                distributions.push(distribution_object)
            }
            let dataset_version_object = Object.assign({},
                {
                    "id": config.prefixes.omg_dataset + artifactId + '_' + version,
                    "dc.identifier": groupId.replace("graph", 'dataset') + '.' + artifactId + '.' + version,
                    "alternative": "Dataset " + artifactId,
                    "description": "Deze dataset bevat een lijst van " + config.types + ", die gebruikt worden binnen het beleidsdomein omgeving van de Vlaamse Overheid.",
                    "identifier": config.prefixes.omg_dataset + artifactId + '_' + version,
                    "isVersionOf": config.prefixes.omg_dataset + artifactId,
                    "issued": date_time,
                    "title": artifactId.split("-").join(' ') + ' Versie ' + version,
                    "rootResource": config.prefixes.omg_conceptscheme + artifactId.split("-")[1],
                    "version": version,
                    "page": config.prefixes.omg_dataset_doc + artifactId + '_' + version + '.html',
                    "distribution": distributions
                }, config.metadata.all, config.metadata.dataset)
            dataset_versions.push(dataset_version_object)
        }
    }
    let dataset_object = Object.assign({},
        {
        "id": config.prefixes.omg_dataset + artifactId,
        "dc.identifier": groupId.replace("graph", 'dataset') + '.' + artifactId, // "be.vlaanderen.omgeving.data.id.dataset.codelijst-matrix",
        "alternative": "Dataset " + artifactId,
        "description": "Deze dataset bevat een lijst van " + config.types + ", die gebruikt worden binnen het beleidsdomein omgeving.",
        "identifier": config.prefixes.omg_dataset + artifactId,
        "title": artifactId.split("-").join(' '),
        "rootResource": config.prefixes.omg_conceptscheme + artifactId.split("-")[1],
        "page": config.prefixes.omg_dataset_doc + artifactId + '.html',
        "hasVersion": dataset_versions
    }, config.metadata.all, config.metadata.dataset)

    return {
        "@context": context,
        "id": config.metadata.catalog.uri,
        "type": config.metadata.catalog.type,
        "dataset": dataset_object
    } ;
}

export { construct_metadata};

