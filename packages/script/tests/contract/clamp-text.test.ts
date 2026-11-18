import { describe, expect, it } from 'vitest';

import { clampText, type TextLimits } from '../../src/contract/clamp-text.js';
import { byteLength } from '../../src/contract/utf8.js';
import { lineOf, textOf } from '../support/line-of.js';

const LIMITS: TextLimits = { lineBytes: 64, outputBytes: 400 };

function lines(count: number, size: number) {
    return Array.from({ length: count }, () => ({ level: 'log' as const, text: 'x'.repeat(size) }));
}

describe('clampText', () => {
    it('leaves logs and tests that fit, and says nothing', () => {
        const logs = [{ level: 'log' as const, text: 'hola' }];
        const tests = [{ name: 'ok', passed: false, message: 'esperaba 1' }];

        expect(clampText(logs, tests, LIMITS)).toEqual({ logs, tests, notes: [] });
    });

    it('keeps a line of exactly the limit and marks the one byte over', () => {
        const exact = 'é'.repeat(32);
        const result = clampText(
            [
                { level: 'log', text: exact },
                { level: 'log', text: `${exact}x` },
            ],
            [],
            LIMITS,
        );

        expect(lineOf(result.logs[0])).toBe(exact);
        expect(byteLength(textOf(result.logs[1]))).toBeLessThanOrEqual(64);
        expect(lineOf(result.logs[1])).toMatch(/…\[cut\]$/u);
        expect(lineOf(result.logs[1])).not.toContain('�');
    });

    it('cuts the name and the message of a test, with the same mark', () => {
        const long = 'x'.repeat(200);
        const [test] = clampText([], [{ name: long, passed: false, message: long }], LIMITS).tests;

        expect(test?.name).toMatch(/…\[cut\]$/u);
        expect(test?.message).toMatch(/…\[cut\]$/u);
        expect(byteLength(test?.name ?? '')).toBeLessThanOrEqual(64);
    });

    it('drops what does not fit in the output and says how much, once', () => {
        const tests = Array.from({ length: 8 }, (_unused, index) => ({
            name: `case ${String(index)} ${'x'.repeat(50)}`,
            passed: true,
        }));
        const result = clampText(lines(10, 60), tests, LIMITS);

        expect(result.tests).toHaveLength(7);
        expect(result.logs).toHaveLength(0);
        expect(result.notes).toEqual([
            { level: 'warn', notice: 'output-cut', params: { lines: 10, cases: 1 } },
        ]);
    });

    it('keeps the cases before the console, so a noisy script never hides its results', () => {
        const tests = Array.from({ length: 3 }, (_unused, index) => ({
            name: `case ${String(index)}`,
            passed: true,
        }));
        const result = clampText(lines(10, 60), tests, LIMITS);

        expect(result.tests).toEqual(tests);
        expect(result.logs).toHaveLength(6);
        expect(result.notes).toEqual([
            { level: 'warn', notice: 'output-cut', params: { lines: 4, cases: 0 } },
        ]);
    });

    it('counts only the kind that lost something', () => {
        const tests = Array.from({ length: 20 }, () => ({ name: 'x'.repeat(60), passed: true }));

        expect(clampText(lines(10, 60), [], LIMITS).notes).toEqual([
            { level: 'warn', notice: 'output-cut', params: { lines: 4, cases: 0 } },
        ]);
        expect(clampText([], tests, LIMITS).notes).toEqual([
            {
                level: 'warn',
                notice: 'output-cut',
                params: { lines: 0, cases: expect.any(Number) as number },
            },
        ]);
    });

    it('counts one line and one case as one each', () => {
        const tight: TextLimits = { lineBytes: 64, outputBytes: 10 };
        const result = clampText(lines(1, 20), [{ name: 'x'.repeat(20), passed: true }], tight);

        expect(result.notes).toEqual([
            { level: 'warn', notice: 'output-cut', params: { lines: 1, cases: 1 } },
        ]);
    });

    it('keeps a notice without values as it came, and counts its code against the output', () => {
        const notice = { level: 'warn' as const, notice: 'note-cut' as const };
        const tight: TextLimits = { lineBytes: 64, outputBytes: byteLength('note-cut') };

        expect(clampText([notice], [], tight)).toEqual({ logs: [notice], tests: [], notes: [] });
        expect(clampText([notice, notice], [], tight).notes).toEqual([
            { level: 'warn', notice: 'output-cut', params: { lines: 1, cases: 0 } },
        ]);
    });

    it('cuts each text a notice interpolates, and leaves its numbers', () => {
        const notice = {
            level: 'warn' as const,
            notice: 'folder-unreadable' as const,
            params: { name: 'x'.repeat(200), count: 3 },
        };
        const [log] = clampText([notice], [], LIMITS).logs;
        const params = log !== undefined && 'params' in log ? log.params : undefined;

        expect(params?.['count']).toBe(3);
        expect(String(params?.['name'])).toMatch(/…\[cut\]$/u);
        expect(byteLength(String(params?.['name']))).toBeLessThanOrEqual(64);
    });
});
