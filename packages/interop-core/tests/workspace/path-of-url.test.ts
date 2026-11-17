import { describe, expect, it } from 'vitest';

import { pathOfUrl } from '../../src/workspace/path-of-url.js';

describe('the path a request url travels', () => {
    it.each([
        ['{{baseUrl}}/pets/{petId}', '/pets/{petId}'],
        ['{{baseUrl}}', '/'],
        ['{{host}}:{{port}}/x?a=1', '/x'],
        ['https://a.b/c#f', '/c'],
        ['https://a.b', '/'],
        ['pets', '/pets'],
        ['', '/'],
        ['/raiz', '/raiz'],
    ])('cuts %s down to %s', (url, path) => {
        expect(pathOfUrl(url)).toBe(path);
    });
});
