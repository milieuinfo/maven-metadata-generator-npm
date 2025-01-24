import {select_latest_jar, compareSemanticVersions, version_from_url, is_jar} from '../../utils/functions.js';
import {test, describe} from 'node:test' ;
import assert from "node:assert";

describe("Semantic versioning, sort numeric and pattern filtering", (s) => {
    const list_of_urls = {
        "results": [
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2-sources.jar"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2-metadata.jar"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2.pom"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2-codelijst.jar"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.2/codelijst-gebouw-10.10.2.jar"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117-sources.jar"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117-metadata.jar"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117.pom"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117-codelijst.jar"},
            {"uri": "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117.jar"}
        ]
    }
    test('Semantic versioning, sort numeric.', async (t) => {
        await t.test("When an admin deploys the latest released jar, this jar should match a certain pattern and it should be sorted according to the rules of semantic versioning", (t) => {
            assert.strictEqual(select_latest_jar(list_of_urls), "https://repo.omgeving.vlaanderen.be/artifactory/api/storage/release/be/vlaanderen/omgeving/data/id/graph/codelijst-gebouw/10.10.117/codelijst-gebouw-10.10.117.jar")
        });
        await t.test('Order by semantic versions.', (t) => {
            const array = ['1.12.0', '1.2.0', '0.0.0'];
            array.sort(compareSemanticVersions)
            assert.strictEqual(array[0], '0.0.0');
            assert.strictEqual(array[1], '1.2.0');
            assert.strictEqual(array[2], '1.12.0');
            array.sort()
            assert.strictEqual(array[0], '0.0.0');
            assert.strictEqual(array[1], '1.12.0');
            assert.strictEqual(array[2], '1.2.0');
        });
        await t.test('Determine version from url.', (t) => {
            assert.strictEqual(version_from_url(list_of_urls.results[4].uri), '10.10.2');
            assert.strictEqual(version_from_url(list_of_urls.results[2].uri), '10.10.2');
            assert.strictEqual(version_from_url(list_of_urls.results[0].uri), '10.10.2');
        });
    });
    test('Pattern recognition.', async (t) => {
        await t.test('Determine whether url is a download url for a plain jar file.', (t) => {
            const url1 = list_of_urls.results[4].uri;
            assert.strictEqual(is_jar(list_of_urls.results[4].uri), true);
            assert.strictEqual(is_jar(list_of_urls.results[2].uri), false);
            assert.strictEqual(is_jar(list_of_urls.results[0].uri), false);
        });
    });
});


