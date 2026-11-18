import type { InteropServer } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { scopeRulesOf } from '../../../src/openapi/import/scope-rules.js';
import { documentOf } from '../support/interop-document.js';

function server(url: string, variables: InteropServer['variables'] = {}): InteropServer {
    return { name: 'default', url, protocol: 'https', security: [], variables, extras: {} };
}

const BEARER = { type: 'http', extras: { scheme: 'bearer' } };

describe('what an OpenAPI import leans on above its requests (scopeRulesOf)', () => {
    it('starts every request of a workspace from the baseUrl of its environment', () => {
        const document = documentOf({ servers: [server('https://api.test/v1')] });

        expect(scopeRulesOf('workspace').base(document)).toBe('{{baseUrl}}');
    });

    it('starts every request of a collection from the first server the document lists', () => {
        const document = documentOf({
            servers: [server('https://api.test/v1'), server('https://staging.test')],
        });

        expect(scopeRulesOf('collection').base(document)).toBe('https://api.test/v1');
    });

    it('writes the server of a collection with the defaults of its variables, and no closing slash', () => {
        const document = documentOf({
            servers: [
                server('https://{region}.api.test/{version}/', {
                    region: { default: 'eu' },
                    version: { default: 'v2' },
                }),
            ],
        });

        expect(scopeRulesOf('collection').base(document)).toBe('https://eu.api.test/v2');
    });

    it('keeps the variable of an address the server gives no default for, as a variable of Mandor', () => {
        const document = documentOf({ servers: [server('https://{tenant}.api.test')] });

        expect(scopeRulesOf('collection').base(document)).toBe('https://{{tenant}}.api.test');
    });

    it('starts from nothing when the document names no server', () => {
        expect(scopeRulesOf('collection').base(documentOf())).toBe('');
    });

    it('lets a request of the workspace inherit the scheme the workspace file carries', () => {
        const document = documentOf({ security: { bearerAuth: BEARER } });

        expect(scopeRulesOf('workspace').inheritedScheme(document)).toBe('bearerAuth');
        expect(scopeRulesOf('workspace').inheritedScheme(documentOf())).toBeUndefined();
    });

    it('leaves a request of a collection its own auth: there is no workspace file to inherit from', () => {
        const document = documentOf({ security: { bearerAuth: BEARER } });

        expect(scopeRulesOf('collection').inheritedScheme(document)).toBeUndefined();
    });
});
