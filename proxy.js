#! /usr/bin/env node
const ramda = require('ramda');
const https = require('https');
const http = require('http');
const url = require('url');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');
const proxy = httpProxy.createProxyServer({});
const { PORT = 5050, mockFile = 'mock.json', api, help } = require('yargs').argv;
const noop = () => undefined;
let mockData;

function exitWithError(msg) {
    console.log(`error: ${msg}`);
    console.log('use: aproxy --help');
    process.exit(1);
}

function methodPath(url) {
    return url.split('?')[0].split('/').filter(x => x);
}

function mock(request, response, next) {
    const result = ramda.path(methodPath(request.url), mockData);

    if (!result) {
        next();
        return;
    }

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Request-Method', '*');
    response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    response.setHeader('Access-Control-Allow-Headers', '*');
    response.setHeader('Content-Type', 'application/json');

    if (request.method === 'OPTIONS') {
        response.writeHead(200);
        response.end();
    } else {
        response.end(JSON.stringify({
            payload: result,
            status: 'Ok'
        }))
    }

    console.log(`info: ${request.url} has been proxied`);
}

if (help) {
    console.log('runs api proxy server');
    console.log('  --api=https://example.com/api (required)');
    console.log('  --mockFile=./path/to/mock/data (optional, defaults to ./mock.json)');
}

if (!api) {
    exitWithError(`specify target API with aproxy --api=example.com/api`)
}

try {
    mockData = JSON.parse(fs.readFileSync(mockFile));
} catch (e) {
    exitWithError(`${mockFile} not found`)
}

fs.watchFile(mockFile, { encoding: 'buffer' }, noop).on('change', () => {
    try {
        mockData = JSON.parse(fs.readFileSync(mockFile));
    } catch (e) {
        console.error('cant parse mock file', e);
    }
});

const server = http.createServer((req, res) => {
    mock(req, res, () => {
        proxy.web(req, res, {
            agent: https.globalAgent,
            headers: { host: url.parse(api).host },
            target: api
        })
    });
});

console.log(`listening on port ${PORT}.\n API (${api}).\n Mock data (${path.resolve(mockFile)})`);
server.listen(PORT);