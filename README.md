# maven-metadata-generator-npm

> **Note:** This project is a fork of [@gezever/rdfjs-skos-dcat-generation](https://github.com/gezever/rdfjs-skos-dcat-generation).
> Changes and enhancements in this repository may differ from the original project.

Node.js library for publishing code lists (controlled vocabularies) as linked data. Code list projects such as [`codelijst-luchtzuiveringssysteem`](https://github.com/milieuinfo/codelijst-luchtzuiveringssysteem) use it during their Maven build to:

1. turn a CSV code list into a SKOS vocabulary, enriched with N3 reasoning and validated with SHACL;
2. generate DCAT metadata (catalog, dataset, distributions) for every released version;
3. deploy the latest release to a Virtuoso triple store.

## How it works

```
CSV ──► JSON-LD ──► N3 reasoning ──► SHACL validation ──► Turtle, N-Triples, JSON-LD, JSON, CSV, XSD, Parquet
         (context)    (eyeling + src/n3/*.n3)
```

- **CSV → JSON-LD**: every row becomes a node; the JSON-LD `@context` from the project maps columns to RDF properties. Cell values containing `|` are split into multiple values.
- **N3 reasoning**: the rule files listed in the configuration are applied with [eyeling](https://github.com/eyereasoner/eyeling), for example to derive `skos:inScheme`, inverse relations and transitive closures. Only the rules in those files are used, not the facts they contain. The rule files shipped with this package are in [`src/n3/`](src/n3) (SKOS, DCAT 3, Dublin Core, FOAF, VoID, SPDX, SPARQL service description, …).
- **SHACL validation**: the result is validated with [rdf-validate-shacl](https://github.com/zazuko/rdf-validate-shacl). If the data does not conform, **no output is written**.
- **Serialisation**: every output format is optional and is only written when it is configured.

## Installation

The package is published in the Omgeving Vlaanderen Artifactory npm registry. Add the scoped registry to `.npmrc`:

```
registry=https://registry.npmjs.org/
@milieuinfo:registry=https://repo.omgeving.vlaanderen.be/artifactory/api/npm/acd-npm/
```

Then add the dependency (projects use [pnpm](https://pnpm.io)):

```sh
pnpm add @milieuinfo/maven-metadata-generator-npm
```

> eyeling is currently installed from the fork [`gezever/eyeling`](https://github.com/gezever/eyeling), pinned to a commit, until its fixes for library use are released upstream. The machine running `pnpm install` therefore needs access to github.com.

## Usage in a code list project

### Project layout

The library resolves paths relative to the working directory. Scripts therefore run from `src/`:

```
codelijst-<name>/
├── pom.xml                      # groupId, artifactId and version are read from here
├── package.json
└── src/
    ├── 01_codelijst_skos_from_csv.js
    ├── 02_metadata.js
    ├── 99_deploy_latest.js
    ├── source/
    │   ├── config.yml           # project configuration (read as ./source/config.yml)
    │   ├── codelijst-source.csv
    │   └── context.json         # JSON-LD context for the CSV columns
    ├── utils/variables.js       # builds the option objects from config.yml
    └── main/resources/…         # generated output, packaged in the Maven jar
```

### package.json

```json
{
  "type": "module",
  "packageManager": "pnpm@9.15.9",
  "scripts": {
    "create_skos": "cd src && node 01_codelijst_skos_from_csv.js",
    "create_metadata": "cd src && node 02_metadata.js"
  },
  "dependencies": {
    "@milieuinfo/maven-metadata-generator-npm": "^0.7.1",
    "@zazuko/env-node": "^1.0.2",
    "csv-parser": "^3.2.0",
    "dotenv": "^16.4.5",
    "js-yaml": "^4.1.0"
  }
}
```

### config.yml

An abbreviated example; see [`codelijst-vlaremrubrieken`](https://github.com/milieuinfo/codelijst-vlaremrubrieken) for a complete one.

```yaml
skos:
  rules:      # N3 rule files, relative to the working directory
    skos_rules:    /../node_modules/@milieuinfo/maven-metadata-generator-npm/src/n3/skos-rules.n3
    dcterms_rules: /../node_modules/@milieuinfo/maven-metadata-generator-npm/src/n3/dcterms-rules.n3
  prefixes:
    concept: https://data.omgeving.vlaanderen.be/id/concept/<name>/
  path: ./main/resources/be/vlaanderen/omgeving/data/id/conceptscheme/
  name: <name>

source:
  path: ./source/
  codelijst_csv: codelijst-source.csv
  context: context.json

metadata:
  start_version: 0.1.0   # first version described in the DCAT metadata
  # catalog, dataset, distribution, … descriptions

prefixes:                # prefixes used in Turtle output and URI construction
  skos: http://www.w3.org/2004/02/skos/core#
  # …

deploy:
  virtuoso: virtuoso-algemeen
```

The rule files for the DCAT metadata and the DCAT-AP SHACL constraints come from this package itself ([`src/config/config.yml`](src/config/config.yml)).

### Scripts

```js
// 01_codelijst_skos_from_csv.js
import { generate_skos } from '@milieuinfo/maven-metadata-generator-npm';
import { skosOptions, skosSource } from './utils/variables.js';

generate_skos(skosOptions, skosSource);
```

```js
// 02_metadata.js
import { create_metadata } from '@milieuinfo/maven-metadata-generator-npm';
import { metadataSource, metadataOptions, datasetOptions, catalogOptions } from './utils/variables.js';

create_metadata(metadataSource, metadataOptions, datasetOptions, catalogOptions);
```

```js
// 99_deploy_latest.js
import { deploy_latest } from '@milieuinfo/maven-metadata-generator-npm';
import { set_env } from './utils/setenv.js';

const omgeving = 'pr';
set_env(omgeving);       // puts virtuoso_rw_username / virtuoso_rw_password in the environment
deploy_latest(omgeving);
```

## API

| Function | Purpose |
|---|---|
| `generate_skos(options, skosSource)` | CSV → SKOS. `skosSource` holds `sourcePath` (or `sourcePaths`), `contextPrefixes`, `rules`, `shapesDataset` and `prefixes`. `options` selects the outputs: `turtlePath`, `ntriplesPath`, `jsonldOptions`, `jsonOptions`, `csvOptions`, `xsdOptions`, `parquetOptions` (the object variants take a `file` and a JSON-LD `frame`). |
| `create_metadata(metadataSource, metadataOptions, datasetOptions, catalogOptions)` | Looks up all released versions of `groupId:artifactId` in Artifactory (from `startVersion` on), adds the next release version, and writes DCAT dataset and catalog metadata as Turtle and JSON-LD. |
| `deploy_latest(omgeving)` | Downloads the latest released `sources` jar from Artifactory, merges its Turtle files into one N-Triples file and replaces the named graph `https://<domain>/id/graph/<artifactId>` on the Virtuoso server `<deploy.virtuoso>-<omgeving>-1`. Requires an existing release. |
| `output(source, rdf, options)` | Validates an N-Triples string with SHACL and writes the configured formats. Used by the functions above. |

All type definitions are documented with JSDoc in [`src/index.js`](src/index.js).

## Maven integration

Run the scripts with the [frontend-maven-plugin](https://github.com/eirslett/frontend-maven-plugin):

```xml
<plugin>
  <groupId>com.github.eirslett</groupId>
  <artifactId>frontend-maven-plugin</artifactId>
  <version>2.0.2</version>
  <configuration>
    <nodeVersion>v26.10.0</nodeVersion>
    <pnpmVersion>9.15.9</pnpmVersion>
    <nodeDownloadRoot>${acd.repository.node.dist.url}</nodeDownloadRoot>
    <pnpmDownloadRoot>${acd.repository.pnpm.dist.url}</pnpmDownloadRoot>
    <serverId>repo.omgeving.vlaanderen.be</serverId>
    <installDirectory>target/</installDirectory>
  </configuration>
  <executions>
    <execution>
      <id>install node and pnpm</id>
      <goals><goal>install-node-and-pnpm</goal></goals>
    </execution>
    <execution>
      <id>pnpm install</id>
      <goals><goal>pnpm</goal></goals>
      <configuration><arguments>install --frozen-lockfile</arguments></configuration>
    </execution>
    <execution>
      <id>create metadata</id>
      <goals><goal>pnpm</goal></goals>
      <configuration><arguments>run create_metadata</arguments></configuration>
    </execution>
  </executions>
</plugin>
```

## Development

```sh
pnpm install
pnpm test      # node --test
pnpm build     # clean install, tests and a rollup bundle in build/release
```

Releases are built and published to Artifactory by Jenkins (`Jenkinsfile.groovy`).

## License

[MIT](./LICENSE)

---

*This project is maintained by [Milieuinfo](https://github.com/milieuinfo).*
