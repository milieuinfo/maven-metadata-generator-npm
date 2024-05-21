'use strict';
import {
    context,
    groupId,
    artifactId,
    config
} from './variables.js';



function construct_dcat(versions) {
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
                }
                if (extension === 'jar'){
                    distribution_object = Object.assign({},{
                        "downloadURL": config.prefixes.repo + groupId.replaceAll(".", '/') + '/' + artifactId + '/' + version + '/' + artifactId + '-' + version + '.' + extension,
                        "packageName" : groupId + '.' + artifactId
                    }, dist, config.metadata.all, distribution_metadata)
                } else {
                    distribution_object = Object.assign({},{
                        "downloadURL": config.prefixes.datasets + groupId.replace("graph", 'distribution') + '.' + artifactId + '.' + version + '.'  + artifactId.replace('codelijst-', '') + '.' + extension,
                    }, dist, config.metadata.all, distribution_metadata)
                }
                distributions.push(distribution_object)
            }
            let dataset_version_object = Object.assign({},
                {
                    "id": config.prefixes.omg_dataset + artifactId + '_' + version,
                    "dc.identifier": groupId.replace("graph", 'dataset') + '.' + artifactId + '.' + version,
                    "alternative": "Dataset " + artifactId,
                    "description": "Deze dataset bevat een lijst van " + config.types + ", die gebruikt worden binnen " + groupId.split('.id')[0].split('.').reverse().join('.') + ".",
                    "identifier": config.prefixes.omg_dataset + artifactId + '_' + version,
                    "isVersionOf": config.prefixes.omg_dataset + artifactId,
                    "issued": date_time,
                    "title": artifactId.split("-").join(' ') + ' Versie ' + version,
                    "rootResource": config.prefixes.conceptscheme + artifactId.split("-")[1],
                    "version": version,
                    "page": config.prefixes.omg_dataset_doc + artifactId + '_' + version + '.html',
                    "distribution": distributions
                }, config.metadata.all, config.metadata.dataset)
            dataset_versions.push(dataset_version_object)
        }
    }
    let named_graph_object = Object.assign({},
        {
            "id": config.prefixes.omg_named_graph + artifactId,
            "dc.identifier": groupId.replace("graph", 'namedgraph') + '.' + artifactId, // "be.vlaanderen.omgeving.data.id.namedgraph.codelijst-matrix",
            "identifier": config.prefixes.omg_named_graph + artifactId,
            "title": "Graph " + artifactId.split("-").join(' '),
            "rootResource": config.prefixes.conceptscheme + artifactId.split("-")[1],
            "source": config.prefixes.omg_distribution + artifactId + '_' + Object.keys(versions[versions.length - 1])[0] + '_jar',
            "sparql-service-description-name": config.prefixes.omg_graph + artifactId,
            "sparql-service-description-graph": config.prefixes.omg_graph + artifactId

        })

    let graphcollection_object = Object.assign({},
        {
            "id": config.prefixes.omg_graphcollection + "sparqlservice",
            "dc.identifier": groupId.replace("graph", 'graphcollection') + '.' + "sparqlservice", // "be.vlaanderen.omgeving.data.id.graphcollection.sparqlservice",
            "identifier": config.prefixes.omg_graphcollection + "sparqlservice",
            "label": "De graphen die gebruikt kunnen worden in de constructie van een dataset via SPARQL Protocol.",
            "namedGraph": named_graph_object,
        })

    let service_object = Object.assign({},
        {
            "id": config.prefixes.omg_service + "sparqlservice",
            "dc.identifier": groupId.replace("graph", 'service') + '.' + "sparqlservice",
            "identifier": config.prefixes.omg_service + "sparqlservice",
            "label": "Sparql service conform SPARQL 1.1 Protocol.",
            "comment": "Een beschrijving, met de verschillende kenmerken, van de sparql service.",
            "namedGraph": named_graph_object,
            "availableGraphs": graphcollection_object,
            "defaultDataset": graphcollection_object
        }, config.metadata.sparqlservice)


    let dataset_object = Object.assign({},
        {
            "id": config.prefixes.omg_dataset + artifactId,
            "dc.identifier": groupId.replace("graph", 'dataset') + '.' + artifactId, // "be.vlaanderen.omgeving.data.id.dataset.codelijst-matrix",
            "alternative": "Dataset " + artifactId,
            "description": "Deze dataset bevat een lijst van " + config.types + ", die gebruikt worden binnen " + groupId.split('.id')[0].split('.').reverse().join('.') ,
            "identifier": config.prefixes.omg_dataset + artifactId,
            "title": artifactId.split("-").join(' '),
            "rootResource": config.prefixes.conceptscheme + artifactId.split("-")[1],
            "page": config.prefixes.omg_dataset_doc + artifactId + '.html',
            "hasVersion": dataset_versions,
            "defaultGraph": config.prefixes.omg_graph + artifactId
        }, config.metadata.all, config.metadata.dataset)

    let dataservice_object = Object.assign({},
        {
            "id": config.prefixes.omg_dataservice + "sparqlendpoint",
            "dc.identifier": groupId.replace("graph", 'dataservice') + '.' + "sparqlendpoint",
            "identifier": config.prefixes.omg_dataservice + "sparqlendpoint",
            "title": "Sparql endpoint op de datasets binnen " + groupId.split('.id')[0].split('.').reverse().join('.'),
            "description": "Sparql endpoint api op de datasets gepubliceerd onder het domein " + groupId,
            "servesDataset": config.prefixes.omg_dataset + artifactId + '_' + Object.keys(versions[versions.length - 1])[0],
            "endpointDescription": service_object
        })

    return {
        "@context": context,
        "id": config.metadata.catalog.uri,
        "type": config.metadata.catalog.type,
        "dataset": dataset_object,
        "namedGraph": named_graph_object,
        "service": dataservice_object,
        "label": "Catalog " + groupId.split('.id')[0].split('.').reverse().join('.'),
    } ;
}

export { construct_dcat };