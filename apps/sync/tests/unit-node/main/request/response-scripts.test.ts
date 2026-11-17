import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { SCRIPT_LIMITS } from '@mandor/script';
import { bodiesDir, bodyFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { responseText } from '../../../../src/main/request/response-scripts.js';

const REF = 'a'.repeat(64);

let root: string;

beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'mandor-response-text-'));
    await mkdir(bodiesDir(root), { recursive: true });
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function stored(bytes: number) {
    return { kind: 'stored' as const, ref: REF, bytes, contentType: 'text/plain' };
}

describe('responseText', () => {
    it('reads an empty answer as empty text and a body of text as it came', async () => {
        expect(await responseText(root, null)).toBe('');
        expect(await responseText(root, { kind: 'inline', encoding: 'utf8', text: 'hi' })).toBe(
            'hi',
        );
    });

    it('gives nothing of a body that is not text', async () => {
        const binary = { kind: 'inline' as const, encoding: 'base64' as const, data: '//4AgA==' };

        expect(await responseText(root, binary)).toBeUndefined();
    });

    it('gives nothing of a body over the size a script may read', async () => {
        const big = 'x'.repeat(SCRIPT_LIMITS.payloadBytes + 1);

        expect(
            await responseText(root, { kind: 'inline', encoding: 'utf8', text: big }),
        ).toBeUndefined();
        expect(await responseText(root, stored(SCRIPT_LIMITS.payloadBytes + 1))).toBeUndefined();
    });

    it('reads a stored body from its file while the send holds it', async () => {
        await writeFile(bodyFile(root, REF), 'from disk');

        expect(await responseText(root, stored(9))).toBe('from disk');
    });

    it('gives nothing of a stored body that cannot be read or is not text', async () => {
        expect(await responseText(root, stored(9))).toBeUndefined();

        await writeFile(bodyFile(root, REF), Buffer.from([0xff, 0xfe, 0x00, 0x80]));

        expect(await responseText(root, stored(4))).toBeUndefined();
        expect(await responseText(root, { ...stored(4), ref: '../x' })).toBeUndefined();
    });
});
