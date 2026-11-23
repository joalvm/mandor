import { calledAs, readAs, renamed, type DialectTable } from './dialect.js';

/**
 * What a script of Bruno names, and how `mandor.` writes it. Bruno reads the request and the
 * response through getters, and `mandor` as values; `test` and `expect` are loose in its scope.
 */
export const BRUNO_DIALECT: DialectTable = {
    dialect: 'bruno',
    roots: ['bru', 'req', 'res', 'test', 'expect'],
    rules: new Map([
        ['bru.getEnvVar', renamed('mandor.variables.get')],
        ['bru.setEnvVar', renamed('mandor.variables.set')],
        ['bru.hasEnvVar', renamed('mandor.variables.has')],
        ['bru.getVar', renamed('mandor.variables.get')],
        ['bru.setVar', renamed('mandor.variables.set')],
        ['bru.hasVar', renamed('mandor.variables.has')],
        ['bru.interpolate', renamed('mandor.variables.replaceIn')],
        ['req.getHeader', renamed('mandor.request.headers.get')],
        ['req.setHeader', renamed('mandor.request.headers.set')],
        ['req.deleteHeader', renamed('mandor.request.headers.delete')],
        ['req.getUrl', calledAs('mandor.request.url')],
        ['req.getMethod', calledAs('mandor.request.method')],
        ['res.getStatus', calledAs('mandor.response.status')],
        ['res.status', readAs('mandor.response.status')],
        ['res.getBody', calledAs('mandor.response.json()')],
        ['res.body', readAs('mandor.response.json()')],
        ['res.getHeader', renamed('mandor.response.headers.get')],
        ['res.getResponseTime', calledAs('mandor.response.time')],
        ['res.responseTime', readAs('mandor.response.time')],
        ['test', renamed('mandor.test')],
        ['expect', renamed('mandor.expect')],
    ]),
};
