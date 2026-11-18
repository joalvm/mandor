import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environmentTextWith } from '../../src/environment/environment-text-with.js';
import { createWorkspace, writeRepoTree, writeEnvironment } from '../../src/index.js';

let root: string;
let text: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-'));

    await writeRepoTree(root, 'Demo');
    await createWorkspace(root, { id: 'payments', name: 'Payments', kind: 'async' });
    await writeEnvironment(root, 'payments', createEnvironment({ id: 'local', name: 'Local' }));

    text = await readFile(
        join(root, 'workspaces', 'payments', 'environments', 'local.yaml'),
        'utf8',
    );
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

describe('the text of an environment with changes', () => {
    it('puts the change in the text and keeps the comments and unknown keys', () => {
        const next = environmentTextWith(`# mine\nother-app: 1\n${text}`, { name: 'Development' });

        expect(next).toContain('name: Development');
        expect(next).toContain('# mine');
        expect(next).toContain('other-app: 1');
    });

    it('leaves the secret values out of the text, now and for what was a secret before', () => {
        const withSecret = environmentTextWith(text, {
            variables: [{ name: 'token', value: 'clear', enabled: true, secret: true }],
        });
        const unmarked = environmentTextWith(withSecret, {
            variables: [{ name: 'token', value: 'clear', enabled: true, secret: false }],
        });

        expect(withSecret).not.toContain('clear');
        expect(unmarked).not.toContain('clear');
    });

    it('writes the variables of a plain change as they are', () => {
        const next = environmentTextWith(text, {
            variables: [{ name: 'host', value: '127.0.0.1', enabled: true, secret: false }],
        });

        expect(next).toContain('127.0.0.1');
    });

    it('refuses a text that is not an environment and a change the domain rejects', () => {
        expect(() => environmentTextWith('{ roto', { name: 'x' })).toThrow();
        expect(() => environmentTextWith('- a\n- b\n', { name: 'x' })).toThrow();
        expect(() => environmentTextWith(text, { name: '' })).toThrow();
    });
});
