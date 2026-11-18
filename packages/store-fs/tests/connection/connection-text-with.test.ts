import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { connectionTextWith } from '../../src/connection/connection-text-with.js';
import { createConnection, createWorkspace, writeRepoTree } from '../../src/index.js';

let root: string;
let text: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Mi repo');
    await createWorkspace(root, {
        id: 'eventos-de-pagos',
        name: 'Eventos de pagos',
        kind: 'async',
    });
    await createConnection(root, 'eventos-de-pagos', {
        id: 'gateway-local',
        name: 'Gateway local',
        url: 'ws://localhost:8080',
    });

    text = await readFile(
        join(root, 'workspaces', 'eventos-de-pagos', 'connections', 'gateway-local.yaml'),
        'utf8',
    );
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the text of a connection with changes', () => {
    it('puts the change in the text and keeps the comments and unknown keys', () => {
        const next = connectionTextWith(`# mine\nother-app: 1\n${text}`, {
            url: 'wss://gateway.example.com',
        });

        expect(next).toContain('url: wss://gateway.example.com');
        expect(next).toContain('# mine');
        expect(next).toContain('other-app: 1');
    });

    /** The old record of switched-off headers would come back as a second list of them. */
    it('writes the headers of a file from before they were lines as lines, and only as lines', () => {
        const legacy = text.replace(
            /^headers:.*$/m,
            'headers:\n  Accept: text/plain\ndisabledHeaders:\n  X-Debug: "1"',
        );
        const next = connectionTextWith(legacy, {
            headers: [{ key: 'Accept', value: 'text/plain', enabled: true }],
        });

        expect(legacy).toContain('disabledHeaders');
        expect(next).toContain('- key: Accept');
        expect(next).not.toContain('disabledHeaders');
    });

    it('refuses a text that is not a connection and a change the domain rejects', () => {
        expect(() => connectionTextWith('{ roto', { url: 'ws://x' })).toThrow();
        expect(() => connectionTextWith('- a\n', { url: 'ws://x' })).toThrow();
        expect(() => connectionTextWith(text, { url: '' })).toThrow();
    });
});
