import { describe, expect, it } from 'vitest';

import { MARKDOWN_DEFAULT_SCHEMA } from '../../../src/components/markdown/markdown-schema.js';

describe('the default schema of markdown', () => {
    it('keeps no script and lets no link run javascript', () => {
        expect(MARKDOWN_DEFAULT_SCHEMA.tagNames).not.toContain('script');
        expect(MARKDOWN_DEFAULT_SCHEMA.protocols?.['href']).not.toContain('javascript');
    });
});
