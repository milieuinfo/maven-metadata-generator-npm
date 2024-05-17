import {artifactId, groupId, config} from "./variables.js";
import fs from "fs";
import request from "request";
import jp from 'jsonpath';
import path from "path";
import AdmZip from "adm-zip";
import {sortLines} from './functions.js';
import { glob } from 'glob';
import {RoxiReasoner} from "roxi-js";
import fetch, { fileFromSync } from 'node-fetch';

const graph = 'https://' + groupId.split('.id')[0].split('.').reverse().join('.') + '/id/graph/' + artifactId

async function deploy_latest(omgeving) {
    select_latest_release(omgeving)
}

function select_latest_release(omgeving) {
    console.log('select latest release');
    let url = 'https://repo.omgeving.vlaanderen.be/artifactory/api/search/gavc?g=' +
        groupId +
        '&a=' +
        artifactId +
        '&classifier=sources&repos=release'
    let options = {json: true};
    request(url, options, (error, res, body) => {
        if (error) {
            return  console.log(error)
        };
        if (!error && res.statusCode == 200) {
            let my_uris = new Array();
            var re = new RegExp("^.*[0-9]+\.[0-9]+\.[0-9]+\.jar$");
            for (const result of body.results) {
                if (re.test(result.uri)){
                    my_uris.push(result.uri);
                }
            }
            // TODO check of versie 10 juist wordt gesorteerd
            unzip(my_uris.sort()[my_uris.length - 1], omgeving)
        };
    });
}

async function unzip(fileUrl, omgeving) {
    var itemsProcessed = 0;
    const dir = path.join(process.cwd(), '/../temp')
    if (fs.existsSync(dir)){
        await fs.rmSync(dir, { recursive: true, force: true });
    }
    await fs.mkdirSync(dir, { recursive: true, force: true });
    const response = await fetch(fileUrl);
    const _json = await response.json();
    request.get({url: jp.query(_json, '$.downloadUri')[0], encoding: null}, (err, res, body) => {
        var zip = new AdmZip(body);
        var zipEntries = zip.getEntries();
        console.log('Unpack turtle files from jar')
        zipEntries.forEach((entry) => {
            if (itemsProcessed < zipEntries.length) {
                itemsProcessed++;
                if (entry.entryName.match(/\.ttl$/i)) {
                    zip.extractEntryTo(entry, dir)
                }
            }
            if (itemsProcessed === zipEntries.length) {
                merge(dir, omgeving)
            }
        })
    });
}

async function merge(dir, omgeving) {
    console.log('Merge turtle files to one n-triple file')
    const reasoner = RoxiReasoner.new();
    const nt_file = path.join(dir, artifactId + '.nt')
    const ttl_files = await glob('**/*.ttl', {
        cwd: dir
    })
    ttl_files.forEach(file => {
        reasoner.add_abox(fs.readFileSync(path.join(dir, file), 'utf8').toString());
    })
    fs.writeFileSync(nt_file,sortLines(reasoner.get_abox_dump()), 'utf8');
    put(nt_file, omgeving)
}

async function put(nt_file, omgeving) {
    const response_drop = await fetch('http://' + config.deploy.virtuoso + '-' + omgeving + '-1.vm.cumuli.be:8080/sparql-auth?default-graph-uri=&query=drop+silent+graph+<' + graph + '>', {
        method: 'GET',
        headers: {
            'Authorization': 'Basic ' + btoa(process.env.virtuoso_rw_username + ':' + process.env.virtuoso_rw_password)
        }
    });
    if (response_drop.status === 200) {
        console.log('Dropped ' + graph)
    }
    else { console.log('Failed Drop')}
    console.log('Status: ' + response_drop.status )
    console.log('statusText: ' + response_drop.statusText)
    console.log('Put n-triple file to named graph ' + graph)
    const response = await fetch('http://' + config.deploy.virtuoso + '-' + omgeving + '-1.vm.cumuli.be:8080/sparql-graph-crud-auth?graph-uri=' + graph, {
        method: 'PUT',
        headers: {
            'Authorization': 'Basic ' + btoa(process.env.virtuoso_rw_username + ':' + process.env.virtuoso_rw_password)
        },
        body: fileFromSync(nt_file)
    });
    if (response.status === 200) {
        console.log('Success!')
        console.log('Put ' + nt_file + ' to ' + response.url)
    }
    console.log('Status: ' + response.status )
    console.log('statusText: ' + response.statusText)
}



export { deploy_latest };