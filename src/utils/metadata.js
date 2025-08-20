'use strict';
import {
    context,
    groupId,
    artifactId,
    config
} from './variables.js';
import { getSchemas } from './rootresource.js';

/**
 * Constructs a DCAT (Data Catalog Vocabulary) catalog object
 * from given dataset versions, metadata, and configuration.
 *
 * The function builds a complete catalog object including:
 * - Dataset versions and their distributions
 * - Named graph and graph collection objects
 * - SPARQL service and dataset service objects
 * - Final catalog object with context, dataset, and service
 *
 * @param {Array<Object<string, string>>} versions -
 *   An array of objects mapping version identifiers to ISO datetime strings.
 *   Example: `[ { "1.0.0": "2024-01-01" }, { "1.1.0": "2024-06-01" } ]`
 *
 * @returns {Object} A DCAT catalog object containing dataset, service, and metadata.
 */
function construct_dcat(versions) {
    const schemas = getSchemas(
        config.skos.path + config.skos.name + '/' + config.skos.name + config.skos.nt
    );

    /**
     * Dataset versions array containing objects with:
     * - identifiers, issued date, version number
     * - distributions (different formats like jar, rdf, etc.)
     * - description and title per version
     */
    const dataset_versions = versions.flatMap(v =>
        Object.entries(v).map(([version, date_time]) => {
            /**
             * Distributions for a given dataset version.
             * Each distribution describes how the dataset is serialized.
             */
            const distributions = Object.entries(config.metadata.distribution).map(
                ([extension, distribution_metadata]) => {
                    let dist = {
                        id: config.prefixes.omg_distribution + artifactId + '_' + version + '_' + extension,
                        'dc.identifier': groupId.replace('graph', 'distribution') + '.' + artifactId + '.' + version + '_' + extension,
                        identifier: config.prefixes.omg_distribution + artifactId + '_' + version + '_' + extension,
                        issued: date_time,
                        version,
                        page:
                            config.prefixes.omg_distribution_doc +
                            artifactId +
                            '_' +
                            version +
                            '_' +
                            extension +
                            '.html'
                    };

                    if (!distribution_metadata.description) {
                        dist.description =
                            artifactId.split('-').join(' ') + ', geserialiseerd als ' + extension + ' bestand.';
                    } else {
                        distribution_metadata.description += ' Versie ' + version + '.';
                    }

                    if (!distribution_metadata.title) {
                        dist.title =
                            artifactId.split('-').join(' ') +
                            ', geserialiseerd als ' +
                            extension +
                            '-formaat. Versie ' +
                            version;
                    } else {
                        distribution_metadata.title += ' Versie ' + version + '.';
                    }

                    /**
                     * @typedef {Object} DistributionObject
                     * @property {string} id - Distribution URI identifier
                     * @property {string} identifier - Canonical identifier
                     * @property {string} issued - Date when issued
                     * @property {string} version - Version number
                     * @property {string} page - Documentation page URL
                     * @property {string} downloadURL - Download link to the distribution
                     * @property {string} [packageName] - Java package name (only for jar)
                     */
                    return extension === 'jar'
                        ? Object.assign(
                            {
                                downloadURL:
                                    config.prefixes.repo +
                                    groupId.replaceAll('.', '/') +
                                    '/' +
                                    artifactId +
                                    '/' +
                                    version +
                                    '/' +
                                    artifactId +
                                    '-' +
                                    version +
                                    '.' +
                                    extension,
                                packageName: groupId + '.' + artifactId
                            },
                            dist,
                            config.metadata.all,
                            distribution_metadata
                        )
                        : Object.assign(
                            {
                                downloadURL:
                                    config.prefixes.datasets +
                                    groupId.replace('graph', 'distribution') +
                                    '.' +
                                    artifactId +
                                    '.' +
                                    version +
                                    '.' +
                                    artifactId.replace('codelijst-', '') +
                                    '.' +
                                    extension
                            },
                            dist,
                            config.metadata.all,
                            distribution_metadata
                        );
                }
            );

            /**
             * @typedef {Object} DatasetVersionObject
             * @property {string} id - Dataset version identifier
             * @property {string} identifier - Canonical identifier
             * @property {string} version - Version string
             * @property {string} issued - Date of issuance
             * @property {Array<DistributionObject>} distribution - Available distributions
             * @property {string} description - Version-specific description
             * @property {string} title - Version-specific title
             */
            const dataset_version_object = Object.assign(
                {
                    id: config.prefixes.omg_dataset + artifactId + '_' + version,
                    'dc.identifier': groupId.replace('graph', 'dataset') + '.' + artifactId + '.' + version,
                    alternative: 'Dataset ' + artifactId,
                    identifier: config.prefixes.omg_dataset + artifactId + '_' + version,
                    isVersionOf: config.prefixes.omg_dataset + artifactId,
                    issued: date_time,
                    rootResource: schemas,
                    version,
                    page: config.prefixes.omg_dataset_doc + artifactId + '_' + version + '.html',
                    distribution: distributions
                },
                config.metadata.all,
                config.metadata.dataset
            );

            dataset_version_object.description = !config.metadata.dataset.description
                ? 'Deze dataset bevat een lijst van ' +
                config.types +
                ', die gebruikt worden binnen ' +
                groupId.split('.id')[0].split('.').reverse().join('.') +
                '.'
                : config.metadata.dataset.description + ' Versie ' + version + '.';

            dataset_version_object.title = !config.metadata.dataset.title
                ? artifactId.split('-').join(' ') + ' Versie ' + version
                : config.metadata.dataset.title + ' Versie ' + version + '.';

            if (dataset_version_object.provenance) {
                dataset_version_object.provenance.id =
                    config.prefixes.omg_dataset.replace('dataset', 'provenancestatement/dataset') + artifactId;
            }

            return dataset_version_object;
        })
    );

    const lastVersion = Object.keys(versions[versions.length - 1])[0];

    /**
     * @typedef {Object} NamedGraphObject
     * @property {string} id - Named graph identifier
     * @property {string} identifier - Canonical identifier
     * @property {string} title - Title for the named graph
     * @property {string} source - Distribution source URI
     */
    const named_graph_object = Object.assign({
        id: config.prefixes.omg_named_graph + artifactId,
        'dc.identifier': groupId.replace('graph', 'namedgraph') + '.' + artifactId,
        identifier: config.prefixes.omg_named_graph + artifactId,
        title: 'Graph ' + artifactId.split('-').join(' '),
        rootResource: schemas,
        source: config.prefixes.omg_distribution + artifactId + '_' + lastVersion + '_jar',
        'sparql-service-description-name': config.prefixes.omg_graph + artifactId,
        'sparql-service-description-graph': config.prefixes.omg_graph + artifactId
    });

    /**
     * @typedef {Object} GraphCollectionObject
     * @property {string} id - Graph collection identifier
     * @property {NamedGraphObject} namedGraph - Contained named graph
     */
    const graphcollection_object = Object.assign({
        id: config.prefixes.omg_graphcollection + 'sparqlservice',
        'dc.identifier': groupId.replace('graph', 'graphcollection') + '.' + 'sparqlservice',
        identifier: config.prefixes.omg_graphcollection + 'sparqlservice',
        label: 'De graphen die gebruikt kunnen worden in de constructie van een dataset via SPARQL Protocol.',
        namedGraph: named_graph_object
    });

    /**
     * @typedef {Object} ServiceObject
     * @property {string} id - Service identifier
     * @property {GraphCollectionObject} availableGraphs - Available graph collection
     * @property {GraphCollectionObject} defaultDataset - Default dataset graph collection
     */
    const service_object = Object.assign(
        {
            id: config.prefixes.omg_service + 'sparqlservice',
            'dc.identifier': groupId.replace('graph', 'service') + '.' + 'sparqlservice',
            identifier: config.prefixes.omg_service + 'sparqlservice',
            label: 'Sparql service conform SPARQL 1.1 Protocol.',
            description: 'Een beschrijving, met de verschillende kenmerken, van de sparql service.',
            availableGraphs: graphcollection_object,
            defaultDataset: graphcollection_object
        },
        config.metadata.sparqlservice
    );

    /**
     * @typedef {Object} DatasetObject
     * @property {string} id - Dataset identifier
     * @property {Array<DatasetVersionObject>} hasVersion - Versions of the dataset
     * @property {string} description - Dataset description
     * @property {string} title - Dataset title
     */
    const dataset_object = Object.assign(
        {
            id: config.prefixes.omg_dataset + artifactId,
            'dc.identifier': groupId.replace('graph', 'dataset') + '.' + artifactId,
            alternative: 'Dataset ' + artifactId,
            identifier: config.prefixes.omg_dataset + artifactId,
            rootResource: schemas,
            page: config.prefixes.omg_dataset_doc + artifactId + '.html',
            hasVersion: dataset_versions,
            defaultGraph: config.prefixes.omg_graph + artifactId
        },
        config.metadata.all,
        config.metadata.dataset
    );

    if (!config.metadata.dataset.description) {
        dataset_object.description =
            'Deze dataset bevat een lijst van ' +
            config.types +
            ', die gebruikt worden binnen ' +
            groupId.split('.id')[0].split('.').reverse().join('.');
    }
    if (!config.metadata.dataset.title) {
        dataset_object.title = artifactId.split('-').join(' ');
    }
    if (dataset_object.provenance) {
        dataset_object.provenance.id =
            config.prefixes.omg_dataset.replace('dataset', 'provenancestatement/dataset') + artifactId;
    }

    /**
     * @typedef {Object} DataServiceObject
     * @property {string} id - Data service identifier
     * @property {string} title - Title of the data service
     * @property {string} description - Description of the service
     * @property {string} servesDataset - The dataset served by this service
     * @property {ServiceObject} endpointDescription - Linked SPARQL service object
     * @property {string} endpointURL - URL of the SPARQL endpoint
     */
    const dataservice_object = Object.assign({
        id: config.prefixes.omg_dataservice + 'sparqlendpoint',
        'dc.identifier': groupId.replace('graph', 'dataservice') + '.' + 'sparqlendpoint',
        identifier: config.prefixes.omg_dataservice + 'sparqlendpoint',
        title:
            'Sparql endpoint op de datasets binnen ' +
            groupId.split('.id')[0].split('.').reverse().join('.'),
        description: 'Sparql endpoint api op de datasets gepubliceerd onder het domein ' + groupId,
        servesDataset: config.prefixes.omg_dataset + artifactId + '_' + lastVersion,
        endpointDescription: service_object,
        endpointURL: config.metadata.sparqlservice.endpoint
    });

    /**
     * @typedef {Object} CatalogObject
     * @property {DatasetObject} dataset - The main dataset object
     * @property {DataServiceObject} service - Associated data service
     * @property {string} [title] - Optional catalog title
     */
    const catalog_object = Object.assign(
        {
            '@context': context,
            dataset: dataset_object,
            service: dataservice_object
        },
        config.metadata.catalog
    );

    if (!config.metadata.dataset.title) {
        catalog_object.title = 'Catalog ' + groupId.split('.id')[0].split('.').reverse().join('.');
    }

    return catalog_object;
}

export { construct_dcat };
