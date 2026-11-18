import { describe, expect, it } from 'vitest';

import {
    formatBytes,
    formatDuration,
    formatSocketEnd,
    httpVersionLabel,
    statusFamilyOf,
} from '../../../src/renderer/response/lib/format-response.js';

describe('the durations of a response', () => {
    it('reads milliseconds while they are under a second', () => {
        expect(formatDuration(0)).toBe('0 ms');
        expect(formatDuration(141.6)).toBe('142 ms');
        expect(formatDuration(999.4)).toBe('999 ms');
    });

    it('reads seconds from a second on, with one decimal', () => {
        expect(formatDuration(1000)).toBe('1.0 s');
        expect(formatDuration(12_340)).toBe('12.3 s');
    });
});

describe('the sizes of a response', () => {
    it('counts bytes under a kilobyte, which is a thousand of them', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(999)).toBe('999 B');
    });

    it('steps up a unit every thousand, with one decimal', () => {
        expect(formatBytes(1000)).toBe('1.0 kB');
        expect(formatBytes(3100)).toBe('3.1 kB');
        expect(formatBytes(2_500_000)).toBe('2.5 MB');
        expect(formatBytes(4_000_000_000)).toBe('4.0 GB');
    });
});

describe('the protocol and the family of a response', () => {
    it('names the protocol the way the wire does', () => {
        expect(httpVersionLabel('1.1')).toBe('HTTP/1.1');
        expect(httpVersionLabel('2')).toBe('HTTP/2');
    });

    it('groups a status by its hundreds', () => {
        expect(statusFamilyOf(101)).toBe('informational');
        expect(statusFamilyOf(204)).toBe('success');
        expect(statusFamilyOf(302)).toBe('redirect');
        expect(statusFamilyOf(404)).toBe('client-error');
        expect(statusFamilyOf(503)).toBe('server-error');
    });

    it('writes an end of the socket the way a URL does, an IPv6 address in brackets', () => {
        expect(formatSocketEnd('127.0.0.1', 8080)).toBe('127.0.0.1:8080');
        expect(formatSocketEnd('::1', 443)).toBe('[::1]:443');
    });
});
