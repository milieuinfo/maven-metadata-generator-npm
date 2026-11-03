'use strict';
import fs from 'fs';
import yaml from 'js-yaml';
import parquet from 'parquetjs-lite';
import { ensureDirSync, to_be_metadated } from './functions.js';

/**
 * Open Data Contract Standard (ODCS) v3.0.2 data contract for the parquet distribution of a codelijst.
 * https://bitol-io.github.io/open-data-contract-standard/v3.0.2/
 *
 * The contract is derived from the same sources as the DCAT metadata (config.yml, pom.xml), plus
 * - the parquet file itself (columns, physical types, row count),
 * - the JSON-LD context (column name -> RDF predicate, @type, @language),
 * - the SHACL shapes of the application profile (sh:name, sh:description per sh:path).
 */

const SH = 'http://www.w3.org/ns/shacl#';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';
const ODCS_VERSION = 'v3.0.2';
const ODCS_SPECIFICATION = 'https://bitol-io.github.io/open-data-contract-standard/v3.0.2/';
const DCTERMS = 'http://purl.org/dc/terms/';
const ODCS_EXTENSION = 'parquet';

const LOGICAL_TYPES = {
    UTF8: 'string',
    BYTE_ARRAY: 'string',
    DOUBLE: 'number',
    FLOAT: 'number',
    INT64: 'integer',
    INT32: 'integer',
    BOOLEAN: 'boolean',
    TIMESTAMP_MILLIS: 'date',
    DATE: 'date'
};

/**
 * IRI of the data contract of a dataset version (same IRI as the contract's `id`).
 * Derived from the omg_dataset prefix: .../id/dataset/ -> .../id/datacontract/
 * @param {Object<string,string>} prefixes - config.prefixes
 * @param {string} artifactId
 * @param {string} version
 * @returns {string}
 */
function odcs_contract_iri(prefixes, artifactId, version) {
    const base = (prefixes?.omg_dataset ?? '').replace(/dataset\/$/, 'datacontract/');
    return `${base}${artifactId}_${version}_${ODCS_EXTENSION}`;
}

/**
 * The dcterms:conformsTo value (JSON-LD, full IRIs, independent of the project context) linking the
 * parquet dcat:Distribution of a dataset version to its ODCS data contract, or undefined when that
 * version has no contract.
 * A version has a contract when config.dcat.dataset_odcs is set and the version is not older than
 * config.dcat.odcs_start_version (default: every version).
 * @param {Object} config - the project's source/config.yml
 * @param {string} artifactId
 * @param {string} version
 * @param {string} extension - distribution key in config.metadata.distribution
 * @returns {Object|undefined}
 */
function odcs_conforms_to(config, artifactId, version, extension) {
    if (extension !== ODCS_EXTENSION || !config?.dcat?.dataset_odcs) return undefined;
    const start = config.dcat.odcs_start_version;
    if (start && !to_be_metadated(version, String(start))) return undefined;
    return {
        '@id': odcs_contract_iri(config.prefixes, artifactId, version),
        [DCTERMS + 'title']: {
            '@value': `ODCS data contract voor de parquet-distributie van ${artifactId}, versie ${version}.`,
            '@language': 'nl'
        },
        [DCTERMS + 'conformsTo']: { '@id': ODCS_SPECIFICATION }
    };
}

/**
 * Expands a prefixed name (`skos:notation`) with the given prefixes; other values are returned as is.
 * @param {string|undefined} iri
 * @param {Object<string,string>} prefixes
 * @returns {string|undefined}
 */
function expandIri(iri, prefixes = {}) {
    const m = /^([^:/]+):(?!\/\/)(.+)$/.exec(iri ?? ''); // not for scheme://... IRIs
    return m && prefixes[m[1]] ? prefixes[m[1]] + m[2] : iri;
}

/**
 * The RDF predicate behind a parquet column, according to the JSON-LD context.
 * @param {string} column
 * @param {Object} context - JSON-LD context
 * @param {Object<string,string>} prefixes
 * @returns {{iri: (string|undefined), term: (Object|undefined)}}
 */
function predicateForColumn(column, context = {}, prefixes = {}) {
    if (['id', '@id'].includes(column)) return { iri: undefined, term: { '@type': '@id' } };
    if (['_type', 'type', '@type'].includes(column)) return { iri: RDF_TYPE, term: { '@type': '@id' } };
    const raw = context[column];
    const term = typeof raw === 'string' ? { '@id': raw } : raw;
    const id = term?.['@id'];
    const iri = id && !id.startsWith('@') ? expandIri(id, { ...prefixes, ...stringPrefixes(context) }) : undefined;
    return { iri, term };
}

/** Prefix definitions inside a JSON-LD context ("skos": "http://...#"). */
function stringPrefixes(context = {}) {
    return Object.fromEntries(Object.entries(context).filter(([, v]) => typeof v === 'string' && /[#/]$/.test(v)));
}

/**
 * Indexes the property shapes of a SHACL dataset by their (IRI) sh:path.
 * The first shape found for a path wins.
 * @param {import('@rdfjs/types').DatasetCore} shapesDataset
 * @returns {Object<string, {shape: string, name: (string|undefined), description: (string|undefined)}>}
 */
function shapesByPath(shapesDataset) {
    const index = {};
    if (!shapesDataset) return index;
    const quads = [...shapesDataset].filter(q => q.predicate.value === SH + 'path' && q.object.termType === 'NamedNode');
    for (const q of quads) {
        if (index[q.object.value]) continue;
        index[q.object.value] = {
            shape: q.subject.value,
            name: firstObject(shapesDataset, q.subject, SH + 'name'),
            description: firstObject(shapesDataset, q.subject, SH + 'description')
        };
    }
    return index;
}

function firstObject(dataset, subject, predicate) {
    for (const q of dataset) {
        if (q.subject.equals(subject) && q.predicate.value === predicate) return q.object.value;
    }
    return undefined;
}

/**
 * Reads the schema and row count of a parquet file.
 * @param {string} parquetFile
 * @returns {Promise<{fields: Object, rowCount: number}>}
 */
async function readParquetSchema(parquetFile) {
    const reader = await parquet.ParquetReader.openFile(parquetFile);
    try {
        return { fields: reader.getSchema().schema, rowCount: Number(reader.getRowCount()) };
    } finally {
        await reader.close();
    }
}

function scalarType(field, term) {
    const type = field.originalType ?? field.type;
    const prop = {
        logicalType: LOGICAL_TYPES[type] ?? 'string',
        physicalType: type === 'UTF8' ? 'BYTE_ARRAY (UTF8)' : type
    };
    if (term?.['@type'] === '@id' && prop.logicalType === 'string') prop.logicalTypeOptions = { format: 'uri' };
    return prop;
}

/**
 * ODCS schema properties for the columns of a parquet file.
 * List columns (parquet LIST: <col>.list.element) become `logicalType: array`.
 * @param {Object} fields - parquet schema fields (ParquetSchema.schema)
 * @param {Object} context - JSON-LD context
 * @param {Object<string,string>} prefixes
 * @param {Object} shapes - result of shapesByPath
 * @returns {Array<Object>}
 */
function odcsProperties(fields, context, prefixes, shapes) {
    return Object.entries(fields).map(([column, field]) => {
        const { iri, term } = predicateForColumn(column, context, prefixes);
        const shape = iri ? shapes[iri] : undefined;
        const element = field.fields?.list?.fields?.element;
        const prop = { name: column, physicalName: column };
        if (element) {
            const items = scalarType(element, term);
            Object.assign(prop, { logicalType: 'array', physicalType: `LIST<${items.physicalType}>`, items: { name: 'element', ...items } });
        } else {
            Object.assign(prop, scalarType(field, term));
        }
        if (shape?.name) prop.businessName = shape.name;
        const description = ['id', '@id'].includes(column)
            ? 'IRI van de beschreven bron.'
            : shape?.description ?? (iri ? `Waarde van ${iri}.` : undefined);
        if (description) prop.description = description;
        prop.required = !field.optional;
        if (['id', '@id'].includes(column)) {
            Object.assign(prop, {
                unique: true,
                primaryKey: true,
                primaryKeyPosition: 1,
                quality: [{ type: 'library', rule: 'duplicateCount', mustBe: 0, dimension: 'uniqueness' }]
            });
        }
        const definitions = [];
        if (iri) definitions.push({ type: 'businessDefinition', url: iri });
        if (shape) definitions.push({ type: 'implementation', url: shape.shape });
        if (definitions.length) prop.authoritativeDefinitions = definitions;
        const custom = [];
        if (iri) custom.push({ property: 'rdfPredicate', value: iri });
        if (term?.['@language']) custom.push({ property: 'language', value: term['@language'] });
        if (term?.['@type'] && term['@type'] !== '@id') custom.push({ property: 'rdfDatatype', value: expandIri(term['@type'], prefixes) });
        if (custom.length) prop.customProperties = custom;
        return prop;
    });
}

/**
 * @typedef {Object} OdcsSource
 * @property {Object} config - the project's source/config.yml
 * @property {string} parquetFile - path of the parquet file to describe
 * @property {Object} context - JSON-LD context used to frame the parquet rows
 * @property {import('@rdfjs/types').DatasetCore} [shapesDataset] - SHACL shapes of the application profile
 * @property {Object<string,string>} [prefixes] - extra prefixes to expand prefixed names in the context
 */

/**
 * @typedef {Object} OdcsMetadataOptions
 * @property {string} artifactId - pom.xml artifactId
 * @property {string} groupId - pom.xml groupId
 * @property {string} next_release_version - version without -SNAPSHOT
 * @property {string} [version] - pom.xml version; a -SNAPSHOT version gives status 'draft', otherwise 'active'
 */

/**
 * Builds an ODCS v3.0.2 data contract object (no I/O).
 * @param {OdcsSource} source
 * @param {OdcsMetadataOptions} metadataOptions
 * @param {{fields: Object, rowCount: number}} parquetSchema - result of readParquetSchema
 * @param {Date} [now]
 * @returns {Object} the contract
 */
function construct_odcs(source, metadataOptions, parquetSchema, now = new Date()) {
    const { config } = source;
    const { groupId, artifactId, next_release_version: version } = metadataOptions;
    const prefixes = { ...config.prefixes, ...config.skos?.prefixes, ...source.prefixes };
    const md = config.metadata ?? {};
    const all = md.all ?? {};
    const dataset = md.dataset ?? {};
    const dist = md.distribution?.parquet ?? {};
    const datasetIri = (config.prefixes?.omg_dataset ?? '') + artifactId;
    const extension = ODCS_EXTENSION;

    const definitions = [
        { type: 'odcs', url: ODCS_SPECIFICATION },
        { type: 'dcat:Dataset', url: datasetIri },
        { type: 'dcat:Distribution', url: `${config.prefixes?.omg_distribution ?? ''}${artifactId}_${version}_${extension}` },
        md.catalog?.uri && { type: 'dcat:Catalog', url: md.catalog.uri },
        all.landingPage && { type: 'landingPage', url: all.landingPage },
        all.license && { type: 'license', url: all.license },
        config.ap && config.prefixes?.omg_ontology && {
            type: 'applicationProfile',
            url: `${config.prefixes.omg_ontology}${config.ap.name}-${config.ap.type}`
        }
    ].filter(Boolean);

    // same download URL as the parquet dcat:Distribution in construct_dcat
    const downloadURL = (config.prefixes?.datasets ?? '') + groupId.replace('graph', 'distribution') + '.' +
        artifactId + '.' + version + '.' + artifactId.replace('codelijst-', '') + '.' + extension;

    const custom = [
        ['publisher', all.publisher],
        ['rightsHolder', all.rightsHolder],
        ['accessRights', all.accessRights],
        ['theme', all.theme],
        ['spatial', all.spatial],
        ['language', all['dct.language']],
        ['mediaType', dist.mediaType],
        ['fileFormat', dist.format],
        ['mavenCoordinates', `${groupId}:${artifactId}:${version}`]
    ].filter(([, v]) => v !== undefined).map(([property, value]) => ({ property, value }));

    const contract = {
        apiVersion: ODCS_VERSION,
        kind: 'DataContract',
        id: odcs_contract_iri(config.prefixes, artifactId, version),
        name: dist.title ?? `${artifactId} (${extension})`,
        version,
        status: metadataOptions.version?.endsWith('-SNAPSHOT') ? 'draft' : 'active',
        domain: config.types,
        dataProduct: artifactId,
        description: {
            purpose: dataset.description,
            usage: dist.description,
            limitations: dataset.provenance?.label
        },
        tags: ['codelijst', 'skos', config.types].filter(Boolean),
        authoritativeDefinitions: definitions,
        servers: [{
            server: 'datasets',
            type: 'custom',
            location: downloadURL,
            format: extension,
            description: `Parquet-distributie van ${groupId}:${artifactId}:${version}.`
        }],
        support: all.contactPoint ? [{ channel: 'helpdesk', url: all.contactPoint }] : undefined,
        slaProperties: all.accrualPeriodicity ? [{ property: 'frequency', value: all.accrualPeriodicity }] : undefined,
        schema: [{
            name: config.skos?.name ?? artifactId,
            physicalName: source.parquetFile.split('/').pop(),
            physicalType: 'table',
            logicalType: 'object',
            businessName: dataset.title,
            description: 'Eén rij per bron uit de codelijst (concept, conceptschema, collectie, ...), geframed met de JSON-LD-context van de codelijst.',
            quality: [{
                type: 'library',
                rule: 'rowCount',
                mustBeGreaterThan: 0,
                dimension: 'completeness',
                description: `Bij generatie: ${parquetSchema.rowCount} rijen.`
            }],
            properties: odcsProperties(parquetSchema.fields, source.context, prefixes, shapesByPath(source.shapesDataset))
        }],
        customProperties: custom,
        contractCreatedTs: now.toISOString()
    };
    return JSON.parse(JSON.stringify(contract)); // drop undefined values
}

/**
 * Writes an ODCS v3.0.2 data contract (YAML) describing the parquet distribution of a codelijst.
 * Call it after create_metadata: that function empties ../temp/.
 * @async
 * @param {OdcsSource} odcsSource
 * @param {OdcsMetadataOptions} metadataOptions
 * @param {{file: string}} odcsOptions - output path of the contract
 * @returns {Promise<Object>} the contract
 * @throws {TypeError} If odcsOptions.file or odcsSource.parquetFile is missing.
 */
async function create_odcs(odcsSource, metadataOptions, odcsOptions) {
    if (!odcsOptions?.file) throw new TypeError('Expected odcsOptions.file');
    if (!odcsSource?.parquetFile) throw new TypeError('Expected odcsSource.parquetFile');
    console.log('odcs generation: data contract for ' + odcsSource.parquetFile);
    const contract = construct_odcs(odcsSource, metadataOptions, await readParquetSchema(odcsSource.parquetFile));
    ensureDirSync(odcsOptions.file);
    fs.writeFileSync(odcsOptions.file, yaml.dump(contract, { lineWidth: 120, noRefs: true }));
    return contract;
}

export { create_odcs, construct_odcs, odcs_contract_iri, odcs_conforms_to, readParquetSchema, odcsProperties, shapesByPath, predicateForColumn, expandIri };
