import {select_latest_jar} from '../../utils/functions.js';

import {test, describe, it} from 'node:test' ;
import assert from "node:assert";


const list_of_urls = {
    "results": [
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2-sources.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2-metadata.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2.pom"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2-codelijst.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117-sources.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117-metadata.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117.pom"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117-codelijst.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.1.0/codelijst-gebouw-10.1.0-sources.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.1.0/codelijst-gebouw-10.1.0-metadata.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.1.0/codelijst-gebouw-10.1.0.pom"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.1.0/codelijst-gebouw-10.1.0-codelijst.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.1.0/codelijst-gebouw-10.1.0.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/1.0.10/codelijst-gebouw-1.0.10-sources.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/1.0.10/codelijst-gebouw-1.0.10-metadata.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/1.0.10/codelijst-gebouw-1.0.10.pom"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/1.0.10/codelijst-gebouw-1.0.10-codelijst.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/1.0.10/codelijst-gebouw-1.0.10.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.0/codelijst-gebouw-0.1.0-sources.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.0/codelijst-gebouw-0.1.0-metadata.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.0/codelijst-gebouw-0.1.0.pom"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.0/codelijst-gebouw-0.1.0-codelijst.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.0/codelijst-gebouw-0.1.0.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.1/codelijst-gebouw-0.1.1-codelijst.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.1/codelijst-gebouw-0.1.1.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.1/codelijst-gebouw-0.1.1.pom"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.1/codelijst-gebouw-0.1.1-sources.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.1.1/codelijst-gebouw-0.1.1-metadata.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.2.0/codelijst-gebouw-0.2.0-metadata.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.2.0/codelijst-gebouw-0.2.0.pom"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.2.0/codelijst-gebouw-0.2.0.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.2.0/codelijst-gebouw-0.2.0-codelijst.jar"
        },
        {
            "uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/0.2.0/codelijst-gebouw-0.2.0-sources.jar"
        }
    ]
}

describe("Select latest released jar", () => {
    test("When an admin deploys the latest released jar, this jar should match a certain pattern and it should be sorted according to the rules of semantic versioning", () => {
        //Act
        const most_recent_jar = select_latest_jar(list_of_urls);
        //Assert
        assert(most_recent_jar === "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117.jar")
    });
});



