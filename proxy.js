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
let mockFn = (url, params, mock) => mock;
let responseMode;
const vorpal = require('vorpal')();

const httpModes = {
  error: {
    statusCode: 202,
    status: 'Error'
  },
  success: {
    statusCode: 200,
    status: 'Ok'
  }
};

vorpal
    .command('start <api>', 'starts the API mocking proxy server')
    .option('--mode <string>', 'specify mode for proxy server (success or error, default is success)')
    .option('--mockFile <mock.json>', 'specify json mock file')
    .option('--mockScript <mock.js>', 'specify postprocessing file. receives req params')
    .option('--port <number>', 'specify port for proxy server')
    .types({
        string: ['api', 'm', 'mockFile', 'mode']
    })
    .action(function(args, callback) {
        const { port = 5050, mockFile = 'mock.json', mockScript, mode = 'success' } = args.options;
        const { api } = args;
        let mockFileMessege = '';

        responseMode = mode;
        try {
            let fileContent;
            try {
                fileContent = fs.readFileSync(mockFile)
            } catch (e) {
                exitWithError(`${mockFile} not found`)
            }

            mockData = JSON.parse(fileContent);
        } catch (e) {
            exitWithError(`${mockFile}: can not parse`)
        }
        if (mockScript) {
            try {
                const mockPath = path.resolve(process.cwd(), mockScript);
                mockFn = require(mockPath);
                mockFileMessege = `\n Mock file loaded ${mockPath}`;
            } catch (e) {
                exitWithError(`${mockScript} not found`)
            }
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

        console.log(`listening on port ${port}.\n API (${api}).\n Mock data (${path.resolve(mockFile)}) \n Mode ${responseMode} ${mockFileMessege}`);
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

function getReqParams(request) {
    return new Promise(resolve => {
        if (request.method === 'POST') {
            let body = '';

            request.on('data', data => body += data);
            request.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    resolve({});
                }
            });
        } else {
            resolve({});
        }
    });
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
        getReqParams(request).then(params => {
            response.writeHead(httpModes[responseMode].statusCode);
            response.end(JSON.stringify({
                payload: mockFn(request.url, params, result),
                status: httpModes[responseMode].status
            }))
        });
    }

    console.log(`info: ${request.url} has been proxied`);
}
