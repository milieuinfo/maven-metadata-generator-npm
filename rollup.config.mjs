import {nodeResolve} from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from '@rollup/plugin-json';
import {builtinModules} from 'node:module';
import {readFileSync} from 'node:fs';

const node = 'node_modules'
const output = `build/release`;

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));
// dependencies en Node built-ins niet mee bundelen; ze worden bij de gebruiker geïnstalleerd
const externals = [...Object.keys(pkg.dependencies ?? {}), ...builtinModules];
const isExternal = id =>
  id.startsWith('node:') || externals.some(dep => id === dep || id.startsWith(`${dep}/`));

export default {
  input: './src/index.js',
  external: isExternal,
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
