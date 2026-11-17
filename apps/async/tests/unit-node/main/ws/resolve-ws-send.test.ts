import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import {
    createWorkspace,
    writeRepoTree,
    writeActiveEnvironments,
    writeEnvironment,
    writeGlobals,
} from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeRepo, openRepo } from '@mandor/host/testing';
import type { SocketSendRequest } from '../../../../src/main/ws/socket-manager.js';
import { resolveWsSend } from '../../../../src/main/ws/resolve-ws-send.js';

let root: string;

const SCHEMA =
    '{"properties":{"id":{"type":"number"}},"required":["id"],"additionalProperties":false}';
const ENVELOPE = '{"event": {{event}}, "data": {{payload}}}';

/** The socket opened against the environment `local`, with its secrets on. */
const LOCAL = { environmentId: 'local', secretsOff: null } as const;

function place() {
    return { root, repo: 'local', readSecret: () => Promise.resolve('') };
}

type Send = Parameters<typeof resolveWsSend>[1];

function sendOf(changes: Partial<Send>): Send {
    return {
        connectionId: 'echo',
        workspaceId: 'payments',
        template: '{"id": 7}',
        origin: 'Order created',
        itemPath: null,
        ...changes,
    };
}

function envelopeSend(changes: Partial<Send>): Promise<SocketSendRequest> {
    return resolveWsSend(place(), sendOf({ frame: ENVELOPE, ...changes }), LOCAL);
}

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-resolve-ws-send-'));
    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(
        root,
        'payments',
        createEnvironment({
            id: 'local',
            name: 'Local',
            variables: [
                { name: 'server', value: 'web', enabled: true, secret: false },
                { name: 'id', value: '99', enabled: true, secret: false },
            ],
        }),
    );
    await writeActiveEnvironments(root, { payments: 'local' });
    openRepo(root);
});

afterEach(async () => {
    closeRepo();
    await rm(root, { recursive: true, force: true });
});

describe('a send through a connection that wraps its frame', () => {
    it('splices the resolved message and the event name into the template', async () => {
        const sent = await envelopeSend({});

        expect(sent.data).toBe('{"event": "Order created", "data": {"id": 7}}');
    });

    it('resolves the variables of the template against the environment of the connection', async () => {
        const sent = await resolveWsSend(
            place(),
            sendOf({ frame: '{"server": "{{server}}", "data": {{payload}}}' }),
            LOCAL,
        );

        expect(sent.data).toBe('{"server": "web", "data": {"id": 7}}');
    });

    it('names the event of the transport first, and the collection item when the transport has none', async () => {
        const named = await resolveWsSend(
            place(),
            sendOf({ frame: '[{{event}}]', event: 'wire.event' }),
            LOCAL,
        );

        expect(named.data).toBe('["wire.event"]');

        const fromCollection = await resolveWsSend(
            place(),
            sendOf({ frame: '[{{event}}]', event: undefined, origin: 'Order created' }),
            LOCAL,
        );

        expect(fromCollection.data).toBe('["Order created"]');
    });

    it('checks the schema of the message, not the shape of the envelope', async () => {
        // The message meets its schema; the envelope would not, and it is not the message.
        const sent = await envelopeSend({ schema: SCHEMA });

        expect(sent.schemaUnmet).toBeUndefined();
    });

    it('marks the message that breaks its schema, whatever the envelope says', async () => {
        const sent = await envelopeSend({ schema: SCHEMA, template: '{"no": 1}' });

        expect(sent.schemaUnmet).toBe(true);
    });
});

describe('a send whose frame cannot be built', () => {
    it('refuses a template that is not valid JSON, and says why', async () => {
        const broken = resolveWsSend(place(), sendOf({ frame: '{"event": {{event}}' }), LOCAL);

        await expect(broken).rejects.toThrow('not valid JSON');
    });

    it('refuses to wrap a payload that is not valid JSON', async () => {
        const text = resolveWsSend(
            place(),
            sendOf({ frame: '{"data": {{payload}}}', template: 'hello' }),
            LOCAL,
        );

        await expect(text).rejects.toThrow('payload is not valid JSON');
    });

    it('refuses a frame that names the event when the emission has no name', async () => {
        const unnamed = envelopeSend({ event: undefined, origin: null });

        await expect(unnamed).rejects.toThrow('has no name');
    });

    it('refuses the frame that the template and the payload cannot build together', async () => {
        const clash = resolveWsSend(
            place(),
            sendOf({ frame: '{{{payload}}: 1}', template: '2' }),
            LOCAL,
        );

        await expect(clash).rejects.toThrow('wrapped frame is not valid JSON');
    });
});

describe('a send through a connection that wraps nothing', () => {
    it('sends the resolved message as it is, and so when the template is blank', async () => {
        const bare = await resolveWsSend(place(), sendOf({}), LOCAL);
        const blank = await resolveWsSend(place(), sendOf({ frame: '   ' }), LOCAL);

        expect(bare.data).toBe('{"id": 7}');
        expect(blank.data).toBe('{"id": 7}');
    });
});

describe('a send against the globals of the origin', () => {
    function messageOf(template: string) {
        return resolveWsSend(place(), sendOf({ template }), LOCAL);
    }

    it('resolves a name only the globals declare', async () => {
        await writeGlobals(root, {
            variables: [{ name: 'tenant', value: 'acme', enabled: true, secret: false }],
        });

        expect((await messageOf('{{tenant}}')).data).toBe('acme');
    });

    it('lets the environment win when both declare the name', async () => {
        await writeGlobals(root, {
            variables: [{ name: 'id', value: 'from-workspace', enabled: true, secret: false }],
        });

        expect((await messageOf('{{id}}')).data).toBe('99');
    });

    it('leaves the placeholder when nobody declares the name', async () => {
        expect((await messageOf('{{tenant}}')).data).toBe('{{tenant}}');
    });
});

describe('a send of an item loaded from a folder', () => {
    beforeEach(async () => {
        const folder = join(root, 'workspaces', 'payments', 'collections', 'orders', 'today');

        await mkdir(folder, { recursive: true });
        await writeFile(
            join(folder, 'folder.yaml'),
            'name: Today\nvariables:\n  - name: server\n    value: carpeta\n    enabled: true\n    secret: false\n',
            'utf8',
        );
    });

    it('resolves with the values of its folder, which override the environment', async () => {
        const sent = await resolveWsSend(
            place(),
            sendOf({ template: '{{server}}', itemPath: 'orders/today/created' }),
            LOCAL,
        );

        expect(sent.data).toBe('carpeta');
    });

    it('resolves free text against the environment alone', async () => {
        const sent = await resolveWsSend(place(), sendOf({ template: '{{server}}' }), LOCAL);

        expect(sent.data).toBe('web');
    });
});

describe('a send through a socket that lives with its secrets off', () => {
    beforeEach(async () => {
        await writeEnvironment(
            root,
            'payments',
            createEnvironment({
                id: 'local',
                name: 'Local',
                variables: [
                    { name: 'server', value: 'web', enabled: true, secret: false },
                    { name: 'token', value: '', enabled: true, secret: true },
                ],
            }),
        );
    });

    function keeping() {
        return {
            ...place(),
            readSecret: (key: string) =>
                Promise.resolve(key === 'local/payments/local/token' ? 'tok_abcdefgh' : null),
        };
    }

    it('resolves the secret when the socket keeps them on', async () => {
        const sent = await resolveWsSend(keeping(), sendOf({ template: '{{token}}' }), LOCAL);

        expect(sent.data).toBe('tok_abcdefgh');
    });

    it('leaves the secret of the message and of the envelope literal, and resolves the rest', async () => {
        const sent = await resolveWsSend(
            keeping(),
            sendOf({
                template: '{"t": "{{token}}", "s": "{{server}}"}',
                frame: '{"auth": "{{token}}", "event": {{event}}, "data": {{payload}}}',
            }),
            { environmentId: 'local', secretsOff: 'destination' },
        );

        expect(sent.data).toBe(
            '{"auth": "{{token}}", "event": "Order created", "data": {"t": "{{token}}", "s": "web"}}',
        );
    });
});
