'use strict';

import jp from "jsonpath";

/**
 * Separates a string by the '|' character if present, otherwise returns the original value.
 * If the input is not a string, returns it unchanged (could be boolean, number, or object).
 * @param {string|boolean|number|object} original - The input value to separate.
 * @returns {string|string[]|boolean|number|object} - The separated array, original string, or unchanged value.
 */
function separateString(original) {
    if (typeof original === 'string') {
        if (original.includes('|')) {
            return original.split('|'); // array
        } else {return original} // string}
    } else {
        return original; // boolean, number or object
    }
}

/**
 * Checks if a given URL points to a .jar file with a semantic version in its name.
 * @param {string} url - The URL to check.
 * @returns {boolean} - True if the URL matches the pattern of a versioned JAR file, false otherwise.
 */
function is_jar(url) {
    var re = new RegExp("^.*[0-9]+\.[0-9]+\.[0-9]+\.jar$");
    return re.test(url);
}

/**
 * Converts a JSON-LD graph array to a table (array of objects) with array values joined as pipe-separated strings.
 * @async
 * @param {object} my_jsonld - The JSON-LD object containing a `.graph` property (an array).
 * @returns {Promise<object[]>} - The flattened table representation of the JSON-LD graph.
 */
async function jsonld_to_table(my_jsonld) {
    var array = jp.query(my_jsonld, '$.graph[*]');
    let temp = {};
    const results = [];
    for (const row of array){
        temp = {};
        for (const [key] of Object.entries(row)) {
            temp[key] = joinArray(row[key])
        }
        results.push(temp)
    }
    return results;
}

/**
 * Extracts the semantic version (X.Y.Z) from a URL.
 * @param {string} url - The URL string to extract the version from.
 * @returns {string} - The extracted version string, or the original string if no match.
 */
function version_from_url(url) {
    return url.replace(/.*-([0-9]*\.[0-9]*\.[0-9]*)[\-a-z]*\..../, "$1")
}

/**
 * Determines if a start version should be metadated, comparing it with a historic version.
 * @param {string} historic_version - The historic version string (semantic version).
 * @param {string} start_version - The start version string (semantic version).
 * @returns {boolean} - True if the start_version is not after the historic_version.
 */
function to_be_metadated(historic_version, start_version){
    const sorted = [historic_version, start_version].sort(compareSemanticVersions);
    return sorted[0] === start_version
}

/**
 * Selects the latest .jar file URL from a list of download URLs.
 * @param {object} list_of_downloadurls - An object with a `results` property containing an array of objects with `uri` properties.
 * @returns {string|undefined} - The URI of the latest .jar file, or undefined if none found.
 */
function select_latest_jar(list_of_downloadurls) {
    let my_uris = new Map();
    for (const result of list_of_downloadurls.results) {
        if (is_jar(result.uri)){
            my_uris.set(version_from_url(result.uri), result.uri);
        }
    }
    const versions = Array.from(my_uris.keys())
    const sorted = versions.sort(compareSemanticVersions);
    return my_uris.get(sorted[versions.length - 1])
}

/**
 * Compares two semantic version strings (e.g., "1.2.3").
 * @param {string} a - The first version string.
 * @param {string} b - The second version string.
 * @returns {number} - 1 if `a` > `b`, -1 if `a` < `b`, 0 if equal.
 */
const compareSemanticVersions = (a, b) => {
    // https://medium.com/geekculture/sorting-an-array-of-semantic-versions-in-typescript-55d65d411df2
    const a1 = a.split('.');    // 1. Split the strings into their parts.
    const b1 = b.split('.');    // 2. Contingency in case there's a 4th or 5th version
    const len = Math.min(a1.length, b1.length);    // 3. Look through each version number and compare.
    for (let i = 0; i < len; i++) {
        const a2 = +a1[ i ] || 0;
        const b2 = +b1[ i ] || 0;
        if (a2 !== b2) {
            return a2 > b2 ? 1 : -1;
        }    }
    return b1.length - a1.length; // 4. We hit this if the all checked versions so far are equal
}

/**
 * Joins an array into a pipe-separated string, or returns the value as-is if not an array.
 * Throws an error and exits if a nested object is detected.
 * @param {Array|string|object} arr - The array or value to join.
 * @returns {string} - The joined string or the value itself.
 */
function joinArray(arr) {
    if (Array.isArray(arr)) {
        if (typeof(arr[0]) === "object"){
            console.log(new Error('Transformation to csv failed.\nThis json is nested. Please add properties to "frame_skos_no_prefixes" in variables.js\nExit process'))
            process.exit(1);
        }
        else {
            return arr.join('|') // array to pipe separated string
        }
    }
    else {
        if (typeof(arr) === "object"){
            console.log(new Error('Transformation to csv failed.\nThis json is nested. Please add properties to "frame_skos_no_prefixes" in variables.js\nExit process'))
            process.exit(1);
        }
        else {
            return arr; // is string
        }
    }
}

/**
 * Sorts the lines of a string, removes duplicates, and joins them back together.
 * Useful for pretty-printing Turtle RDF dumps.
 * @param {string} str - The string to sort.
 * @returns {string} - The sorted, de-duplicated string.
 */
const sortLines = str => Array.from(new Set(str.split(/\r?\n/))).sort().join('\n'); // To sort the dump of the reasoner for turtle pretty printing. Easier than using the Sink or Store.

/**
 * Exported functions for use in other modules.
 */
export { separateString, joinArray, sortLines, select_latest_jar, compareSemanticVersions, version_from_url, is_jar, jsonld_to_table, to_be_metadated };