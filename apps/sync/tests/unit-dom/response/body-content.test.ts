import { failure, success } from '@mandor/ipc';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../src/renderer/app/sync-bridge.js';
import { bodyContentOf } from '../../../src/renderer/response/lib/body-content.js';
import { saveBody } from '../../../src/renderer/response/lib/save-body.js';
import { httpResponseWith, textBody } from '../support/http-response.js';

function encode(text: string) {
    return new TextEncoder().encode(text);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe('what a view of a body draws', () => {
    const json = {
        complete: true,
        kind: 'json',
        laidOut: true,
        preview: false,
        type: 'application/json',
    } as const;

    it('lays out json, and keeps what is not json as it came', () => {
        const laid = bodyContentOf({ ...json, bytes: encode('{"a":1}'), format: 'json' });
        const broken = bodyContentOf({ ...json, bytes: encode('{"a":'), format: 'json' });

        expect(laid.text).toBe('{\n    "a": 1\n}');
        expect(laid.language).toBe('jsonc');
        expect(broken.text).toBe('{"a":');
    });

    /** A server that escapes every accent is still read in letters, as Postman shows it. */
    it('reads the unicode escapes of laid out json as their letters, and only those', () => {
        const laid = bodyContentOf({
            ...json,
            bytes: encode('{"m":"electr\\u00f3nico","u":"a\\/b"}'),
            format: 'json',
        });
        const raw = bodyContentOf({ ...json, bytes: encode('"\\u00f3"'), format: 'raw' });

        expect(laid.text).toBe('{\n    "m": "electrónico",\n    "u": "a\\/b"\n}');
        expect(raw.text).toBe('"\\u00f3"');
    });

    it('lays out nothing and colours nothing past the size the viewer lays out', () => {
        const big = bodyContentOf({
            ...json,
            bytes: encode('{"a":1}'),
            format: 'json',
            laidOut: false,
        });

        expect(big.text).toBe('{"a":1}');
        expect(big.language).toBe('plaintext');
    });

    it('reads the raw text as it came, the bytes as base64, and gives a dump no text', () => {
        const input = { ...json, bytes: encode('{"a":1}') };

        expect(bodyContentOf({ ...input, format: 'raw' }).text).toBe('{"a":1}');
        expect(bodyContentOf({ ...input, format: 'base64' }).text).toBe('eyJhIjoxfQ==');
        expect(bodyContentOf({ ...input, format: 'hex' }).text).toBe('');
        expect(bodyContentOf({ ...input, format: 'xml' }).language).toBe('xml');
    });

    it('hands a preview the text as it came, whatever format was picked', () => {
        const drawn = bodyContentOf({
            ...json,
            bytes: encode('{"a":1}'),
            format: 'hex',
            preview: true,
        });

        expect(drawn.text).toBe('{"a":1}');
    });

    /** A page drawn at every window read all it had again and loaded the frame once per window. */
    it('hands a preview its text only once all of it is here', () => {
        const page = {
            ...json,
            bytes: encode('<p>a'),
            format: 'raw',
            kind: 'html',
            preview: true,
        } as const;

        expect(bodyContentOf({ ...page, complete: false }).text).toBe('');
        expect(bodyContentOf({ ...page, complete: true }).text).toBe('<p>a');
    });

    it('makes an image an address only once all of it is here', () => {
        const input = {
            bytes: Uint8Array.of(1, 2, 3),
            format: 'hex',
            kind: 'image',
            laidOut: true,
            preview: true,
            type: 'image/png',
        } as const;

        expect(bodyContentOf({ ...input, complete: false }).dataUrl).toBeNull();
        expect(bodyContentOf({ ...input, complete: true }).dataUrl).toBe(
            'data:image/png;base64,AQID',
        );
    });
});

describe('saving the body of a response', () => {
    it('asks main for the file it wrote, never naming a path', async () => {
        const save = vi
            .spyOn(syncBridge.request, 'saveBody')
            .mockResolvedValue(success({ path: 'C:/x/out.json' }));
        const stored = {
            bytes: 9,
            contentType: 'application/json',
            kind: 'stored',
            ref: 'a'.repeat(64),
        };

        const outcome = await saveBody(httpResponseWith({ body: stored }), 'json');

        expect(outcome).toEqual({ state: 'saved' });
        expect(save).toHaveBeenCalledWith({ ref: 'a'.repeat(64), suggestedName: 'response.json' });
    });

    it('hands over the text or the base64 the window still holds', async () => {
        const save = vi
            .spyOn(syncBridge.request, 'saveBody')
            .mockResolvedValue(success({ path: 'C:/x/out' }));

        await saveBody(httpResponseWith({ body: textBody('hola') }), 'text');
        await saveBody(
            httpResponseWith({ body: { data: 'AQID', encoding: 'base64', kind: 'inline' } }),
            'binary',
        );

        expect(save).toHaveBeenNthCalledWith(1, {
            encoding: 'utf8',
            suggestedName: 'response.txt',
            text: 'hola',
        });
        expect(save).toHaveBeenNthCalledWith(2, {
            data: 'AQID',
            encoding: 'base64',
            suggestedName: 'response.bin',
        });
    });

    it('takes closing the dialog and having no body for cancelled, not for a failure', async () => {
        vi.spyOn(syncBridge.request, 'saveBody').mockResolvedValue(success({ path: null }));

        expect(await saveBody(httpResponseWith({ body: textBody('x') }), 'text')).toEqual({
            state: 'cancelled',
        });
        expect(await saveBody(httpResponseWith(), 'text')).toEqual({ state: 'cancelled' });
    });

    it('reports the code main failed with, and unknown when the bridge itself threw', async () => {
        const save = vi
            .spyOn(syncBridge.request, 'saveBody')
            .mockResolvedValueOnce(failure('fs-write', 'full'))
            .mockRejectedValueOnce(new Error('gone'));
        const response = httpResponseWith({ body: textBody('x') });

        expect(await saveBody(response, 'text')).toEqual({ error: 'fs-write', state: 'failed' });
        expect(await saveBody(response, 'text')).toEqual({ error: 'unknown', state: 'failed' });
        expect(save).toHaveBeenCalledTimes(2);
    });
});
