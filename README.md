# maven-metadata-generator-npm

> **Note:** This project is a fork of [@gezever/rdfjs-skos-dcat-generation](https://github.com/gezever/rdfjs-skos-dcat-generation).  
> Changes and enhancements in this repository may differ from the original project.

This project provides a Node.js-based tool for generating SKOS or other controlled vocabularies, typically managed as CSV files and exported as RDF. It is designed to be used as a dependency in projects such as [`@milieuinfo/codelijst-luchtzuiveringssysteem`](https://github.com/milieuinfo/codelijst-luchtzuiveringssysteem), where vocabulary or code lists are maintained and released through Maven builds.

## Overview

Many data-driven projects manage controlled vocabulary lists (e.g., SKOS) in CSV format and generate RDF exports for publication or integration. This metadata generator assists in automating the creation of Maven metadata (such as `maven-metadata.xml` or similar artifacts) during the build process, ensuring that releases contain accurate, up-to-date metadata.

The generator is built to be integrated into Maven builds using the [frontend-maven-plugin](https://github.com/eirslett/frontend-maven-plugin) by Eirslett. This allows you to run the metadata generator as part of your Maven lifecycle using Node.js.

## Typical Use Case

- You maintain a list (like SKOS) in a CSV file.
- During the Maven build, you generate RDF output from the CSV.
- This package is invoked to generate metadata files describing the release, version, and other Maven-related information.
- The generated metadata is included in the Maven package or published artifact.

## Installation

In your code list project, add this package as an npm dependency:

```sh
npm install --save-dev maven-metadata-generator-npm
```

Or, if you use Yarn:

```sh
yarn add --dev maven-metadata-generator-npm
```

## Usage

Typically, you will run this generator via a script, or from your `package.json`, or directly using the Eirslett frontend-maven-plugin.

### Using npm dependencies

Add a dependency to your `package.json`:

```json
{
  "dependencies": {
    "child_process": "^1.0.2",
    "csv-parser": "^3.2.0",
    "dotenv": "^16.4.5",
    "js-yaml": "^4.1.0",
    "maven-metadata-generator-npm": "^0.3.26"
  }
}
```

### Using the frontend-maven-plugin

Below is an example Maven configuration to run the generator during the build process:

```xml
<plugin>
  <groupId>com.github.eirslett</groupId>
  <artifactId>frontend-maven-plugin</artifactId>
  <version>1.14.1</version>
  <executions>
    <execution>
      <id>generate-maven-metadata</id>
      <goals>
        <goal>npm</goal>
      </goals>
      <configuration>
        <arguments>run generate-maven-metadata</arguments>
      </configuration>
    </execution>
  </executions>
</plugin>
```

## Integration Details

- Designed to be used as part of automated build pipelines.
- Ensures that Maven artifacts for code lists include the appropriate metadata.
- Works well in combination with SKOS/RDF generation tools, and can be invoked before or after those processes.

## Contributing

Contributions are welcome! Please submit issues or pull requests via GitHub.

## License

[MIT](./LICENSE)

---

*This project is maintained by [Milieuinfo](https://github.com/milieuinfo).*