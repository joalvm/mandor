import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { requestTemplates } from '../../../../src/main/request/request-templates.js';

function withBody(type: 'json' | 'text', content: string) {
    return { ...createRequestItem({ name: 'login' }), body: { type, content } };
}

describe('the texts of a request that take variables', () => {
    it('sends a json body as the JSON its comments and trailing commas meant', () => {
        const draft = '{\n  "user": "{{user}}", // who\n  // "debug": true\n}';

        expect(JSON.parse(requestTemplates(withBody('json', draft))['body'] ?? '')).toEqual({
            user: '{{user}}',
        });
    });

    it('sends a text body exactly as it reads', () => {
        const draft = '{ // not json\n';

        expect(requestTemplates(withBody('text', draft))['body']).toBe(draft);
    });
});
