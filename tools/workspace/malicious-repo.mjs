import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import {
    ATTACK,
    asyncScripts,
    escapeBatch,
    HOSTILE_ENVIRONMENT,
    HOSTILE_WORKSPACE,
    syncScripts,
} from './malicious-sources.mjs';

// The specs read the attack text from here, so the tree and what it says travel together.
export { ATTACK, ATTACK_MARK } from './malicious-sources.mjs';

const run = promisify(execFile);

/** What the app hashes to stand for an approved script, so the file in the repo is a real try. */
function approvalKey(origin, level, event, source) {
    return createHash('sha256')
        .update([origin, HOSTILE_WORKSPACE, level, event, source].join('\0'))
        .digest('hex');
}

function headerLine(key, value) {
    return `  - key: ${key}\n    value: "${value}"\n    enabled: true\n`;
}

function indented(source) {
    return source
        .split('\n')
        .map((row) => `      ${row}`)
        .join('\n');
}

function requestYaml(name, url, headers, source) {
    return [
        // An item on disk is flat: the envelope (`kind`, `name`) and the keys of the request at
        // the same level, the way the app writes its own — no id, no wrapper of its own.
        'kind: request',
        `name: ${name}`,
        'method: GET',
        `url: "${url}"`,
        `headers:\n${headers}`,
        'body:\n  type: none',
        'scripts:\n  onBeforeRequest:\n    source: |-\n' + indented(source),
        '',
    ].join('\n');
}

/** The file of one hostile connection: its id is its name, the way a thief names things. */
function connectionYaml(id, transport, url, scripts) {
    return [
        `id: ${id}`,
        `name: ${id}`,
        `transport: ${transport}`,
        `url: ${url}`,
        `headers:\n${headerLine('X-Api-Key', `{{${ATTACK.secretName}}}`)}`,
        `environmentId: ${HOSTILE_ENVIRONMENT}`,
        ...(transport === 'socketio' ? ['socketio:\n  engineTransport: polling-then-upgrade'] : []),
        'scripts:',
        ...Object.entries(scripts).map(
            ([event, source]) => `  ${event}:\n    source: |-\n${indented(source)}`,
        ),
        '',
    ].join('\n');
}

/** The hostile requests: the file id of each, and the key its script and name hang from. */
const ITEMS = [
    ['steal', 'steal'],
    ['redirect', 'redirect'],
    ['loop', 'loop'],
    ['bomb', 'bomb'],
    ['dynamic-import', 'dynamicImport'],
    ['trojan', 'trojan'],
];

/** The hostile requests, each aimed the way its family of attack needs. */
function syncFiles(evilHttp) {
    const sources = syncScripts(evilHttp);
    // The person's own header carries the secret; the nested one reaches for it through `a`.
    const headers =
        headerLine('X-Api-Key', `{{${ATTACK.secretName}}}`) + headerLine('X-Nested', '{{a}}');
    const hop = encodeURIComponent(`${evilHttp}${ATTACK.hopPath}`);
    const urlOf = (key) =>
        key === 'redirect' ? `{{base}}/open?to=${hop}&status=307` : '{{base}}/echo';

    // The tree shows what the order of each group names: an order nobody wrote is an empty one.
    return [
        [
            'collection.yaml',
            `name: ${ATTACK.collection}\norder:\n  - ${ATTACK.folder}\nheaders: []\nscripts:\n  onBeforeRequest:\n    source: |-\n${indented(escapeBatch(evilHttp))}`,
        ],
        [
            `${ATTACK.folder}/folder.yaml`,
            `name: ${ATTACK.folder}\norder:\n${ITEMS.map(([id]) => `  - ${id}`).join('\n')}\nscripts:\n  onBeforeRequest:\n    source: |-\n${indented(sources.folder)}`,
        ],
        ...ITEMS.map(([id, key]) => [
            `${ATTACK.folder}/${id}.yaml`,
            requestYaml(ATTACK.requests[key], urlOf(key), headers, sources[key]),
        ]),
    ];
}

/** The hostile connections: a spy on WebSocket, a siphon on Socket.IO polling, an echo, two killers. */
function asyncFiles(input) {
    const sockets = asyncScripts(input.evilHttp);

    return [
        [
            'espia.yaml',
            connectionYaml('espia', 'websocket', input.ws, {
                onBeforeConnect: sockets.spy,
            }),
        ],
        [
            'sifon.yaml',
            connectionYaml('sifon', 'socketio', input.socketIo, {
                onBeforeConnect: sockets.siphon,
            }),
        ],
        ['eco.yaml', connectionYaml('eco', 'websocket', input.ws, { onMessage: sockets.echo })],
        [
            'bucle.yaml',
            connectionYaml('bucle', 'websocket', input.ws, { onBeforeConnect: sockets.loop }),
        ],
        ['bomba.yaml', connectionYaml('bomba', 'websocket', input.ws, { onMessage: sockets.bomb })],
    ];
}

/** The environment of the hostile workspace: its base URL, the line that nests the secret, the secret. */
function environmentYaml(api) {
    const secret = { name: ATTACK.secretName, value: '', enabled: true, secret: true };

    return [
        `id: ${HOSTILE_ENVIRONMENT}`,
        'name: Local',
        'variables:',
        `  - name: base\n    value: "${api}"\n    enabled: true\n    secret: false`,
        `  - name: a\n    value: "{{${ATTACK.secretName}}}"\n    enabled: true\n    secret: false`,
        `  - ${['name', 'value', 'enabled', 'secret'].map((key) => `${key}: ${JSON.stringify(secret[key])}`).join('\n    ')}`,
        '',
    ].join('\n');
}

/** The hashes of the approvals a hostile repo would love to bring: one try at laundering trust. */
function approvedHashes(origin, sync, evilHttp, input) {
    const sources = syncScripts(evilHttp);
    const sockets = asyncScripts(input.evilHttp);

    return sync
        ? [
              approvalKey(origin, 'collection', 'onBeforeRequest', escapeBatch(evilHttp)),
              approvalKey(origin, 'folder', 'onBeforeRequest', sources.folder),
              ...Object.entries(sources)
                  .filter(([id]) => id !== 'folder')
                  .map(([, source]) => approvalKey(origin, 'request', 'onBeforeRequest', source)),
          ]
        : [
              approvalKey(origin, 'connection', 'onBeforeConnect', sockets.spy),
              approvalKey(origin, 'connection', 'onBeforeConnect', sockets.siphon),
              approvalKey(origin, 'connection', 'onBeforeConnect', sockets.loop),
              approvalKey(origin, 'connection', 'onMessage', sockets.echo),
              approvalKey(origin, 'connection', 'onMessage', sockets.bomb),
          ];
}

/** Writes every file of the repo, clearing whatever stood there before. */
async function writeFiles(work, bare, files) {
    await rm(work, { force: true, maxRetries: 10, recursive: true });
    await rm(bare, { force: true, maxRetries: 10, recursive: true });

    for (const [file, text] of files) {
        await mkdir(join(work, file, '..'), { recursive: true });
        await writeFile(join(work, file), text, 'utf8');
    }
}

/** One commit of everything, cloned into the bare repo the spec hands to the app. */
async function commitAndBare(work, bare) {
    const git = (args) => run('git', ['-C', work, ...args]);
    const author = ['-c', 'user.name=Mandor e2e', '-c', 'user.email=e2e@mandor.test'];

    await run('git', ['init', '--initial-branch=main', work]);
    await git([...author, 'add', '-A']);
    await git([...author, 'commit', '-m', 'hostile: scripts at every level']);
    await run('git', ['clone', '--bare', work, bare]);
}

/**
 * Lays out the repo a hostile author would share: scripts at every level that try every escape,
 * a secret the scripts want, an open redirect to lean on, and `.mandor/` committed with approval
 * hashes shaped exactly like the ones the app writes, so anything it still trusts from the repo
 * shows. One commit, cloned into a bare repo the spec hands to the app as an origin. The hashes
 * cannot be right on this machine — the id of an origin is drawn here — which is the defence
 * itself; the file is the honest try at laundering trust a hostile repo would make.
 */
export async function makeMaliciousRepo(root, input) {
    const { kind, api, evilHttp } = input;
    const origin = ATTACK.originName.toLowerCase();
    const work = join(root, 'hostile');
    const bare = join(root, 'hostile.git');
    const workspace = `workspaces/${HOSTILE_WORKSPACE}`;
    const sync = kind === 'sync';
    const files = [
        [
            'mandor.yaml',
            `formatVersion: 2\nname: ${ATTACK.originName}\nworkspaces:\n  - ${HOSTILE_WORKSPACE}\n`,
        ],
        [
            `${workspace}/workspace.yaml`,
            `id: ${HOSTILE_WORKSPACE}\nkind: ${kind}\nname: Payments\n`,
        ],
        [`${workspace}/environments/${HOSTILE_ENVIRONMENT}.yaml`, environmentYaml(api)],
        ...(sync
            ? syncFiles(evilHttp).map(([file, text]) => [
                  `${workspace}/collections/pedidos/${file}`,
                  text,
              ])
            : asyncFiles(input).map(([file, text]) => [`${workspace}/connections/${file}`, text])),
    ];

    await writeFiles(work, bare, files);

    const approved = approvedHashes(origin, sync, evilHttp, input);

    await mkdir(join(work, '.mandor'), { recursive: true });
    await writeFile(join(work, '.mandor/approved-scripts.txt'), `${approved.join('\n')}\n`, 'utf8');
    await commitAndBare(work, bare);

    return { bare, url: pathToFileURL(bare).href };
}
