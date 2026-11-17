import { MARKDOWN_DEFAULT_SCHEMA } from '@mandor/ui';
import { describe, expect, it } from 'vitest';

import { DOC_SANITIZE_SCHEMA } from '../src/lib/doc-sanitize-schema.js';

describe('what a doc may leave in the tree', () => {
    it('lets a link go to the resources of the app and to the web, and to nothing else', () => {
        expect(DOC_SANITIZE_SCHEMA.protocols?.['href']).toEqual(['mandor', 'http', 'https']);
    });

    /** An image is fetched with nobody clicking it: no scheme at all, only paths against the doc. */
    it('leaves images with no scheme at all', () => {
        expect(DOC_SANITIZE_SCHEMA.protocols?.['src']).toEqual([]);
    });

    it('keeps the rest of the schema of the forges as it was', () => {
        expect(DOC_SANITIZE_SCHEMA.tagNames).toEqual(MARKDOWN_DEFAULT_SCHEMA.tagNames);
        expect(DOC_SANITIZE_SCHEMA.attributes).toEqual(MARKDOWN_DEFAULT_SCHEMA.attributes);
    });

    it('does not change the default schema it was made from', () => {
        expect(MARKDOWN_DEFAULT_SCHEMA.protocols?.['href']).not.toContain('mandor');
    });
});
