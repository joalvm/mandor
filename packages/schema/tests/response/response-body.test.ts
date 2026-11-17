import { describe, expect, it } from 'vitest';

import { responseBodySchema } from '../../src/response/response-body.js';

const HASH = 'a'.repeat(64);

describe('responseBodySchema', () => {
    it('reads a text body that stayed in memory', () => {
        const body = { kind: 'inline', encoding: 'utf8', text: '{"ok":true}' };

        expect(responseBodySchema.parse(body)).toEqual(body);
    });

    it('reads a binary body that stayed in memory as base64', () => {
        const body = { kind: 'inline', encoding: 'base64', data: 'AAEC' };

        expect(responseBodySchema.parse(body)).toEqual(body);
    });

    it('reads a body that went to disk as a reference, a size and a type', () => {
        const body = { kind: 'stored', ref: HASH, bytes: 3_000_000, contentType: 'image/png' };

        expect(responseBodySchema.parse(body)).toEqual(body);
    });

    it('refuses a reference that is not a sha-256 in hex: it is never a path', () => {
        expect(
            responseBodySchema.safeParse({
                kind: 'stored',
                ref: '../../secret',
                bytes: 1,
                contentType: '',
            }).success,
        ).toBe(false);
        expect(
            responseBodySchema.safeParse({
                kind: 'stored',
                ref: 'A'.repeat(64),
                bytes: 1,
                contentType: '',
            }).success,
        ).toBe(false);
    });

    it('refuses an encoding it does not know', () => {
        expect(
            responseBodySchema.safeParse({ kind: 'inline', encoding: 'latin1', text: 'x' }).success,
        ).toBe(false);
    });

    it('refuses a negative size', () => {
        expect(
            responseBodySchema.safeParse({
                kind: 'stored',
                ref: HASH,
                bytes: -1,
                contentType: '',
            }).success,
        ).toBe(false);
    });
});
