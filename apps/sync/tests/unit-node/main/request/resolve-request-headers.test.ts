import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { RequestItem } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { snippetRequestOf } from '../../../../src/main/codegen/snippet-request-of.js';
import { requestBodyBytes } from '../../../../src/main/request/request-body-bytes.js';
import { resolvedRequestOf } from '../../../../src/main/request/resolve-request.js';
import type { ResolvedRequest } from '../../../../src/main/request/resolved-request.js';
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
    await writeTreeFile(
        'orders/collection.yaml',
        `name: Orders\n${headers(['X-Team', 'a'], ['X-Page', '{{page}}'])}`,
    );
    await writeTreeFile('orders/today/folder.yaml', `name: Today\n${headers(['x-team', 'b'])}`);
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

async function writeTreeFile(path: string, contents: string): Promise<void> {
    const file = join(root, 'workspaces', 'payments', 'collections', path);

    await mkdir(join(file, '..'), { recursive: true });
    await writeFile(file, contents, 'utf8');
}

function headers(...pairs: [string, string][]): string {
    return `headers:\n${pairs
        .map(([key, value]) => `  - key: ${key}\n    value: "${value}"\n    enabled: true\n`)
        .join('')}`;
}

async function resolved(
    itemPath: string | null,
    request: Partial<RequestItem> = {},
): Promise<ResolvedRequest> {
    const result = await resolvedRequestOf(
        placeOf(root),
        {
            ...sendInput({ url: 'http://api.test/', ...request }),
            itemPath,
        },
        { tokens: 'fetch', networkFor: DIRECT_NETWORK },
    );

    if (!result.ok) {
        throw new Error(result.error.message);
    }

    return result.value;
}

describe('a request sends the headers of its folders', () => {
    it('sends the lines of every level, the closest winning by name, resolved', async () => {
        expect((await resolved('orders/today/list')).headers).toEqual([
            ['X-Page', '2'],
            ['x-team', 'b'],
        ]);
    });

    it('lets its own line win over every level', async () => {
        const { headers: sent } = await resolved('orders/today/list', {
            headers: [line('X-Team', 'c')],
        });

        expect(sent).toEqual([
            ['X-Page', '2'],
            ['X-Team', 'c'],
        ]);
    });

    it('sends a value pasted with its line break without the break, as a browser does', async () => {
        const { headers: sent } = await resolved(null, {
            headers: [line('User-Agent', 'Mozilla/5.0\r\n'), line('X-Inner', 'a\r\nb')],
        });

        expect(sent).toEqual([
            ['User-Agent', 'Mozilla/5.0'],
            ['X-Inner', 'a\r\nb'],
        ]);
    });

    it('sends no inherited header when it is saved nowhere', async () => {
        expect((await resolved(null)).headers).toEqual([]);
    });

    it('lets an inherited content type override the one its body implies', async () => {
        await writeTreeFile(
            'orders/collection.yaml',
            `name: Orders\n${headers(['Content-Type', 'application/vnd.api+json'])}`,
        );

        const request = await resolved('orders/list', {
            body: { type: 'json', content: '{}' },
        });
        const wire = await requestBodyBytes(root, request.body, request.headers);

        expect(wire.headers).toEqual([['Content-Type', 'application/vnd.api+json']]);
    });

    it('writes the same inherited headers in the code it generates', async () => {
        const { request } = snippetRequestOf(await resolved('orders/today/list'));

        expect(request.headers).toEqual([
            ['X-Page', '2'],
            ['x-team', 'b'],
        ]);
    });
});
