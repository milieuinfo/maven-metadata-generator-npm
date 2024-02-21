import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from '@rollup/plugin-json';

const node = 'node_modules'
const output = `build/release`;

export default {
  input: './src/index.js',
  output: {
    dir: `${output}`,
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    format: 'esm'
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    json({
      include: [`${node}/**/*.json`]
    })
  ]
};
