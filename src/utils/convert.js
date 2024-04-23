import Environment from '@zazuko/env/Environment.js'
import baseEnv from '@zazuko/env'
import { FsUtilsFactory } from '@zazuko/rdf-utils-fs'
import fromStream from 'rdf-dataset-ext/fromStream.js'
import formats from '@rdfjs/formats'

// create an environment by adding FsUtilsFactory
const env = new Environment([FsUtilsFactory], { parent: baseEnv })
// add parsers+serializers
env.formats.import(formats)



async function convert_file(input_file_path, output_file_path) {
    // parse
    const dataset = await env.dataset().import(env.fromFile(input_file_path))

// serialise
    await env.toFile(dataset.toStream(), output_file_path)
}


export { convert_file }