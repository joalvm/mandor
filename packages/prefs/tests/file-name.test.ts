import { describe, expect, it } from 'vitest';

import { fileName } from '../src/lib/file-name.js';

describe('the name a chosen file is shown by', () => {
    it.each([
        ['/home/ana/corp.pem', 'corp.pem'],
        ['C:\\Users\\ana\\client.p12', 'client.p12'],
        ['bare.pem', 'bare.pem'],
    ])('shows %s as %s', (path, name) => {
        expect(fileName(path)).toBe(name);
    });
});
