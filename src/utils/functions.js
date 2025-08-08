'use strict';


import jp from "jsonpath";

function separateString(original) {
    if (typeof original === 'string') {
        if (original.includes('|')) {
            return original.split('|'); // array
        } else {return original} // string}
    } else {
        return original; // boolean, number or object
    }
}


function is_jar(url) {
    var re = new RegExp("^.*[0-9]+\.[0-9]+\.[0-9]+\.jar$");
    return re.test(url);
}


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

function version_from_url(url) {
    return url.replace(/.*-([0-9]*\.[0-9]*\.[0-9]*)[\-a-z]*\..../, "$1")
}

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

const sortLines = str => Array.from(new Set(str.split(/\r?\n/))).sort().join('\n'); // To sort the dump of the reasoner for turtle pretty printing. Easier than using the Sink or Store.


export { separateString, joinArray, sortLines, select_latest_jar, compareSemanticVersions, version_from_url, is_jar, jsonld_to_table };

