import { describe, expect, it } from 'vitest';

import { clampOutput } from '../../src/contract/clamp-output.js';
import type { ScriptRunOutput } from '../../src/contract/script-run.js';
import { byteLength } from '../../src/contract/utf8.js';
import { SCRIPT_LIMITS } from '../../src/limits/script-limits.js';
import { lineOf, textOf } from '../support/line-of.js';

const OUTPUT: ScriptRunOutput = {
    effects: [{ kind: 'var', name: 'a', value: '1' }],
    logs: [{ level: 'log', text: 'hola' }],
    tests: [{ name: 'ok', passed: true }],
};

describe('clampOutput', () => {
    it('gives back an output that is inside every limit as it came', () => {
        expect(clampOutput(OUTPUT, 'onBeforeRequest')).toEqual(OUTPUT);
    });

    it('cuts a line over the limit of the spec, in bytes, with text on the edge', () => {
        const edge = 'é'.repeat(SCRIPT_LIMITS.lineBytes / 2);
        const out = clampOutput(
            {
                ...OUTPUT,
                logs: [
                    { level: 'log', text: edge },
                    { level: 'log', text: `${edge}!` },
                ],
            },
            'onBeforeRequest',
        );

        expect(lineOf(out.logs[0])).toBe(edge);
        expect(byteLength(textOf(out.logs[1]))).toBeLessThanOrEqual(SCRIPT_LIMITS.lineBytes);
        expect(lineOf(out.logs[1])).toMatch(/…\[cut\]$/u);
    });

    it('puts the notes after the logs of the script, and keeps the rest', () => {
        const out = clampOutput(
            {
                ...OUTPUT,
                effects: [{ kind: 'var', name: '__proto__', value: '1' }],
            },
            'onBeforeRequest',
        );

        expect(out.effects).toEqual([]);
        expect(out.logs.map(lineOf)).toEqual([
            'hola',
            { level: 'warn', notice: 'effect-name-forbidden', params: { name: '__proto__' } },
        ]);
        expect(out.tests).toEqual(OUTPUT.tests);
    });

    it('keeps the error, with its message cut to a line', () => {
        const message = 'x'.repeat(SCRIPT_LIMITS.lineBytes + 1);
        const out = clampOutput(
            {
                ...OUTPUT,
                error: { message, errorName: 'Error', line: 3, column: 1 },
            },
            'onBeforeRequest',
        );

        expect(byteLength(out.error?.message ?? '')).toBeLessThanOrEqual(SCRIPT_LIMITS.lineBytes);
        expect(out.error).toMatchObject({ errorName: 'Error', line: 3, column: 1 });
    });

    it('drops what the event cannot write before it counts the rest', () => {
        const out = clampOutput(
            {
                ...OUTPUT,
                effects: [
                    { kind: 'url', value: 'http://elsewhere' },
                    { kind: 'var', name: 'a', value: '1' },
                ],
            },
            'onResponse',
        );

        expect(out.effects).toEqual([{ kind: 'var', name: 'a', value: '1' }]);
        expect(out.logs.map(lineOf)).toEqual([
            'hola',
            {
                level: 'warn',
                notice: 'effect-not-in-event',
                params: { event: 'onResponse', kind: 'url' },
            },
        ]);
    });

    it('leaves a run with no error without one', () => {
        expect('error' in clampOutput(OUTPUT, 'onBeforeRequest')).toBe(false);
    });

    it('takes limits as a parameter and does not change the output it was given', () => {
        const input: ScriptRunOutput = {
            ...OUTPUT,
            effects: [
                { kind: 'var', name: 'a', value: '1' },
                { kind: 'var', name: 'b', value: '1' },
            ],
        };
        const copy = structuredClone(input);
        const out = clampOutput(input, 'onBeforeRequest', { ...SCRIPT_LIMITS, variables: 1 });

        expect(out.effects).toEqual([]);
        expect(input).toEqual(copy);
    });
});
