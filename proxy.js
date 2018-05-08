#! /usr/bin/env node
const ramda = require('ramda');
const https = require('https');
const http = require('http');
const url = require('url');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');
const proxy = httpProxy.createProxyServer({});
const noop = () => undefined;
let mockData;
let responseMode;
const vorpal = require('vorpal')();

const httpModes = {
  error: {
    statusCode: 202,
    status: 'Error'
  },
  success: {
    statucCode: 200,
    status: 'Ok'
  }
};

vorpal
    .command('start <api>', 'starts the API mocking proxy server')
    .option('--mode <string>', 'specify mode for proxy server (success or error, default is success)')
    .option('--mockFile <mock.json>', 'specify json mock file')
    .option('--port <number>', 'specify port for proxy server')
    .types({
        string: ['api', 'm', 'mockFile', 'mode']
    })
    .action(function(args, callback) {
        const { port = 5050, mockFile = 'mock.json', mode = 'success' } = args.options;
        const { api } = args;
        try {
            responseMode = mode;
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

        console.log(`listening on port ${port}.\n API (${api}).\n Mock data (${path.resolve(mockFile)}) \n Mode ${responseMode}`);
        server.listen(port);
    });

vorpal
    .parse(process.argv);

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
        response.writeHead(httpModes[responseMode].statusCode);
        response.end();
    } else {
        response.writeHead(httpModes[responseMode].statusCode);
        response.end(JSON.stringify({
            payload: result,
            status: httpModes[responseMode].status
        }))
    }

    console.log(`info: ${request.url} has been proxied`);
}
