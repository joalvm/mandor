import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    DEFAULT_REQUEST_SECTION,
    openSectionOf,
    REQUEST_SECTIONS,
    sectionsOf,
} from '../../../../src/renderer/features/requests/lib/request-section.js';

const PLAIN = createRequestItem({ name: 'plain' });
const WITH_PATH = {
    ...createRequestItem({ name: 'with path' }),
    pathParams: [{ enabled: true, key: 'petId', value: '' }],
};
const WITH_EXAMPLES = {
    ...createRequestItem({ name: 'with examples' }),
    examples: [{ body: '{}', contentType: 'application/json', name: '', status: '200' }],
};
const WITH_SCRIPTS = {
    ...createRequestItem({ name: 'with scripts' }),
    importedScripts: [{ event: 'onResponse' as const, dialect: 'postman' as const, source: 'a()' }],
};

describe('the sections of a request', () => {
    it('opens on the query, the smallest thing to fix when a send went wrong', () => {
        expect(DEFAULT_REQUEST_SECTION).toBe('params');
    });

    it('lists the halves of the request, in the order of the tools people come from', () => {
        expect(REQUEST_SECTIONS).toEqual([
            'doc',
            'params',
            'path',
            'auth',
            'headers',
            'body',
            'schema',
            'scripts',
            'settings',
        ]);
    });

    it('shows the schema beside a json body, and beside any body once a schema is written', () => {
        const json = { ...PLAIN, body: { content: '', type: 'json' as const } };

        expect(sectionsOf(PLAIN)).not.toContain('schema');
        expect(sectionsOf(json)).toEqual([
            'doc',
            'params',
            'auth',
            'headers',
            'body',
            'schema',
            'scripts',
            'settings',
        ]);
        expect(sectionsOf({ ...PLAIN, bodySchema: '{}' })).toContain('schema');
        expect(sectionsOf({ ...PLAIN, bodySchema: '  ' })).not.toContain('schema');
    });

    it('leaves out the path when the url asks for none, and always has the scripts', () => {
        expect(sectionsOf(PLAIN)).toEqual([
            'doc',
            'params',
            'auth',
            'headers',
            'body',
            'scripts',
            'settings',
        ]);
        expect(sectionsOf(WITH_PATH)).toContain('path');
        expect(sectionsOf(WITH_EXAMPLES)).toEqual(sectionsOf(PLAIN));
        expect(sectionsOf(WITH_SCRIPTS)).toEqual(sectionsOf(PLAIN));
    });

    it('draws the remembered section, or the first one when it is gone', () => {
        expect(openSectionOf('headers', sectionsOf(PLAIN))).toBe('headers');
        expect(openSectionOf('path', sectionsOf(PLAIN))).toBe('params');
        expect(openSectionOf('nonsense', sectionsOf(PLAIN))).toBe('params');
    });
});
