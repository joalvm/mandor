import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createEnvironment } from '@mandor/schema';
import { writeEnvironment } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolvedRequestOf } from '../../../../src/main/request/resolve-request.js';
import {
    DIRECT_NETWORK,
    line,
    placeOf,
    repoWithEnvironment,
    sendInput,
} from './support/resolve-fixture.js';

let root: string;

beforeEach(async () => {
    root = await repoWithEnvironment();
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function writeTreeFile(path: string, contents: string): Promise<void> {
    const file = join(root, 'workspaces', 'payments', 'collections', path);

    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, contents, 'utf8');
}

function variables(...pairs: [string, string][]): string {
    return `variables:\n${pairs
        .map(
            ([name, value]) =>
                `  - name: ${name}\n    value: "${value}"\n    enabled: true\n    secret: false\n`,
        )
        .join('')}`;
}

async function headersOf(itemPath: string | null): Promise<[string, string][]> {
    const result = await resolvedRequestOf(
        placeOf(root, 's3cr3t-largo'),
        {
            ...sendInput({
                url: 'http://api.test/',
                headers: [line('X-Level', '{{level}}'), line('X-Base', '{{base}}')],
            }),
            itemPath,
        },
        { tokens: 'fetch', networkFor: DIRECT_NETWORK },
    );

    if (!result.ok) {
        throw new Error(result.error.message);
    }

    return result.value.headers;
}

describe('a request resolves with the chain of its folder', () => {
    beforeEach(async () => {
        await writeTreeFile(
            'orders/collection.yaml',
            `name: Orders\n${variables(['level', 'coleccion'], ['base', 'b'])}`,
        );
        await writeTreeFile(
            'orders/today/folder.yaml',
            `name: Today\n${variables(['level', 'carpeta'])}`,
        );
    });

    it('takes the value of the closest folder over the environment and the collection', async () => {
        expect(await headersOf('orders/today/list')).toEqual([
            ['X-Level', 'carpeta'],
            ['X-Base', 'b'],
        ]);
    });

    it('lets the environment override the collection, and keeps the base of the collection', async () => {
        await writeEnvironment(
            root,
            'payments',
            createEnvironment({
                id: 'local',
                name: 'Local',
                variables: [{ name: 'level', value: 'entorno', enabled: true, secret: false }],
            }),
        );

        expect(await headersOf('orders/list')).toEqual([
            ['X-Level', 'entorno'],
            ['X-Base', 'b'],
        ]);
    });

    it('resolves a request saved nowhere against no folder', async () => {
        expect(await headersOf(null)).toEqual([
            ['X-Level', '{{level}}'],
            ['X-Base', '{{base}}'],
        ]);
    });

    it('keeps hidden a folder value that names a secret of the environment', async () => {
        await writeTreeFile(
            'orders/today/folder.yaml',
            `name: Today\n${variables(['level', '{{token}}'])}`,
        );

        const headers = await headersOf('orders/today/list');

        expect(headers[0]).toEqual(['X-Level', 's3cr3t-largo']);
    });
});
