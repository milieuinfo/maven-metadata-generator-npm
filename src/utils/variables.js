'use strict';
import yaml from 'js-yaml';
import fs, {readFileSync} from "fs";
import rdf from "@zazuko/env-node";
import convert from "xml-js";
import jp from "jsonpath";


const config = yaml.load(fs.readFileSync('../resources/source/config.yml', 'utf8'));

const context_skos_prefixes = Object.assign({},JSON.parse(readFileSync(config.source.path + config.source.context)),
    config.prefixes, {  '@base' : "https://data.omgeving.vlaanderen.be/id/concept/matrix/"}, config.skos.prefixes)

const context_skos_no_prefixes = JSON.parse(readFileSync(config.source.path + config.source.context));

const context_catalog = Object.assign({},JSON.parse(readFileSync(config.source.path + config.source.context)), config.prefixes)


const shapes_skos = await rdf.dataset().import(rdf.fromFile(config.ap.path + config.ap.name + '-' + config.ap.type + '/' + config.ap.name + '-' + config.ap.type + config.ap.turtle))

const shapes_dcat = await rdf.dataset().import(rdf.fromFile(config.ap.path + 'dcat-' + config.ap.type + '/' + 'dcat-' + config.ap.type + config.ap.turtle))

var result = JSON.parse(convert.xml2json(readFileSync('../../../pom.xml', 'utf8'), {compact: true, spaces: 4}));

const groupId = jp.query(result, '$.project.groupId._text').toString();

const artifactId = jp.query(result, '$.project.artifactId._text').toString();

const version = jp.query(result, '$.project.version._text').toString();

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

const skos_prefixes = {
    xsd: "http://www.w3.org/2001/XMLSchema#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    vlcs: "https://data.omgeving.vlaanderen.be/id/conceptscheme/",
    cm: "https://data.omgeving.vlaanderen.be/id/concept/matrix/",
    com: "https://data.omgeving.vlaanderen.be/id/collection/matrix/",
    dcat: "http://www.w3.org/ns/dcat#",
    dct: "http://purl.org/dc/terms/",
    dc: "http://purl.org/dc/elements/1.1/",
    gemet: "http://www.eionet.europa.eu/gemet/concept/",
}


const dcat_prefixes = {
    access_right: "http://publications.europa.eu/resource/authority/access-right/",
    adms: "http://www.w3.org/ns/adms#",
    assettype: "http://purl.org/adms/assettype/",
    country: "http://publications.europa.eu/resource/authority/country/",
    datasets: "https://datasets.omgeving.vlaanderen.be/",
    datatheme_be: "http://vocab.belgif.be/auth/datatheme/",
    datatheme_eu: "http://publications.europa.eu/resource/authority/data-theme/",
    dcat: "http://www.w3.org/ns/dcat#",
    dc: "http://purl.org/dc/elements/1.1/",
    dcterms: "http://purl.org/dc/terms/",
    eurovoc: "http://eurovoc.europa.eu/",
    file_type: "http://publications.europa.eu/resource/authority/file-type/",
    foaf: "http://xmlns.com/foaf/0.1/",
    formats: "http://www.w3.org/ns/formats/",
    frequency: "http://publications.europa.eu/resource/authority/frequency/",
    gemet: "http://www.eionet.europa.eu/gemet/concept/",
    licence :  "http://data.vlaanderen.be/id/licentie/modellicentie-gratis-hergebruik/",
    metadata: "https://data.omgeving.vlaanderen.be/ns/metadata#",
    omg_catalog: "https://data.omgeving.vlaanderen.be/id/catalog/",
    omg_collection: "https://data.omgeving.vlaanderen.be/id/collection/",
    omg_conceptscheme: "https://data.omgeving.vlaanderen.be/id/conceptscheme/",
    omg_dataservice: "https://data.omgeving.vlaanderen.be/id/dataservice/",
    omg_dataset: "https://data.omgeving.vlaanderen.be/id/dataset/",
    omg_distribution: "https://data.omgeving.vlaanderen.be/id/distribution/",
    omg_distribution_doc:    "https://data.omgeving.vlaanderen.be/doc/distribution/",
    omg_graphcollection: "https://data.omgeving.vlaanderen.be/id/graphcollection/",
    omg_graph: "https://data.omgeving.vlaanderen.be/id/graph/",
    omg_id: "https://data.omgeving.vlaanderen.be/id/",
    omg_named_graph: "https://data.omgeving.vlaanderen.be/id/namedgraph/",
    omg_ontology: "https://data.omgeving.vlaanderen.be/id/ontology/",
    omg_package: "https://data.omgeving.vlaanderen.be/id/package/",
    omg_periodoftime: "https://data.omgeving.vlaanderen.be/id/periodoftime/",
    omg_service: "https://data.omgeving.vlaanderen.be/id/service/",
    omg_vcard: "https://data.omgeving.vlaanderen.be/id/vcard/",
    ovo: "http://data.vlaanderen.be/id/organisatie/",
    owl: "http://www.w3.org/2002/07/owl#",
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    sd: "http://www.w3.org/ns/sparql-service-description#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    spdx: "http://spdx.org/rdf/terms#",
    ssd: "http://www.w3.org/ns/sparql-service-description#",
    ts: "http://www.w3.org/ns/formats/",
    vcard: "http://www.w3.org/2006/vcard/ns#",
    void: "http://rdfs.org/ns/void#",
    xsd: "http://www.w3.org/2001/XMLSchema#"

}

const frame_skos_prefixes = {
    "@context": context_skos_prefixes,
    "@type": ["skos:ConceptScheme", "skos:Collection", "skos:Concept"],
    "member": {
        "@type": "skos:Concept",
        "@embed": "@never",
        "@omitDefault": true
    },
    "inScheme": {
        "@type": "skos:ConceptScheme",
        "@embed": "@never",
        "@omitDefault": true
    },
    "topConceptOf": {
        "@type": "skos:ConceptScheme",
        "@embed": "@never",
        "@omitDefault": true
    },
    "broader": {
        "@type": "skos:Concept",
        "@embed": "@never",
        "@omitDefault": true
    },
    "narrower": {
        "@type": "skos:Concept",
        "@embed": "@never",
        "@omitDefault": true
    },
    "hasTopConcept": {
        "@type": "skos:Concept",
        "@embed": "@never",
        "@omitDefault": true
    }
}

const frame_skos_no_prefixes = {
    "@context": context_skos_no_prefixes,
    "@type": ["http://www.w3.org/2004/02/skos/core#ConceptScheme", "http://www.w3.org/2004/02/skos/core#Collection", "http://www.w3.org/2004/02/skos/core#Concept"],
    "member": {
        "@type": "http://www.w3.org/2004/02/skos/core#Concept",
        "@embed": "@never",
        "@omitDefault": true
    },
    "inScheme": {
        "@type": "http://www.w3.org/2004/02/skos/core#ConceptScheme",
        "@embed": "@never",
        "@omitDefault": true
    },
    "topConceptOf": {
        "@type": "http://www.w3.org/2004/02/skos/core#ConceptScheme",
        "@embed": "@never",
        "@omitDefault": true
    },
    "broader": {
        "@type": "http://www.w3.org/2004/02/skos/core#Concept",
        "@embed": "@never",
        "@omitDefault": true
    },
    "narrower": {
        "@type": "http://www.w3.org/2004/02/skos/core#Concept",
        "@embed": "@never",
        "@omitDefault": true
    },
    "hasTopConcept": {
        "@type": "http://www.w3.org/2004/02/skos/core#Concept",
        "@embed": "@never",
        "@omitDefault": true
    }
}

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


export { sortLines, rdf_rules, spdx_rules, spdx_extra_rules, void_rules, foaf_rules, dcterms_rules, dcat_rules, skos_rules, dcat_dataset_jsonld, dcat_dataset_turtle, dcat_catalog_jsonld, dcat_catalog_turtle, groupId, artifactId, version, next_release_version, name, frame_skos_prefixes, frame_skos_no_prefixes, config, context_skos_prefixes, context_skos_no_prefixes, shapes_skos, shapes_dcat, skos_prefixes, dcat_prefixes, context_catalog, frame_catalog };

