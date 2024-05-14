'use strict';


function separateString(originalString) {
    if (originalString.includes('|')) {
        return originalString.split('|'); // pipe separated string to array
    }
    else {
        return originalString; // is string
    }
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


export { separateString, joinArray, sortLines };

