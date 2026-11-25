import { describe, expect, it } from 'vitest';

import { withDefaultScheme } from '../../src/index.js';

describe('withDefaultScheme', () => {
    it('leaves a url that names its scheme as it came', () => {
        expect(withDefaultScheme('https://api.test/x', 'http')).toBe('https://api.test/x');
        expect(withDefaultScheme('WSS://api.test', 'ws')).toBe('WSS://api.test');
        expect(withDefaultScheme('ftp://files.test', 'http')).toBe('ftp://files.test');
    });

    it('puts the default scheme in front of a host typed alone', () => {
        expect(withDefaultScheme('localhost:81/session', 'http')).toBe(
            'http://localhost:81/session',
        );
        expect(withDefaultScheme('api.test', 'ws')).toBe('ws://api.test');
        expect(withDefaultScheme('127.0.0.1', 'http')).toBe('http://127.0.0.1');
    });

    it('completes a url that starts at the authority', () => {
        expect(withDefaultScheme('//api.test/x', 'https')).toBe('https://api.test/x');
    });

    it('drops the blanks around what was typed before it decides', () => {
        expect(withDefaultScheme('  localhost:81 \n', 'http')).toBe('http://localhost:81');
        expect(withDefaultScheme(' https://api.test ', 'http')).toBe('https://api.test');
    });

    it('leaves a path with no host as it came: there is no host to dial', () => {
        expect(withDefaultScheme('/orders', 'http')).toBe('/orders');
    });

    it('leaves an empty url empty, so the send says there is nothing to dial', () => {
        expect(withDefaultScheme('', 'http')).toBe('');
        expect(withDefaultScheme('   ', 'http')).toBe('');
    });
});
