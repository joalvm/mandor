import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { withTemplates } from '../../../src/insomnia/import/template-of.js';

describe('withTemplates', () => {
    it('writes the references the way Mandor does, in either form of Insomnia', () => {
        expect(withTemplates('{{ _.base }}/pets/{{ id }}?q={{_.q}}')).toEqual({
            value: '{{base}}/pets/{{id}}?q={{q}}',
            notes: [],
        });
    });

    it('rewrites inside lists and objects, and leaves other values alone', () => {
        const value = {
            url: '{{ _.a }}',
            rows: ['{{ _.b }}', 3, true, null],
            deep: { x: '{{ c }}' },
        };

        expect(withTemplates(value).value).toEqual({
            url: '{{a}}',
            rows: ['{{b}}', 3, true, null],
            deep: { x: '{{c}}' },
        });
    });

    it('leaves a tag or an expression as text and says so once', () => {
        const result = withTemplates([
            '{% uuid %}',
            '{% uuid %}',
            '{{ _.a.b }}',
            'x {{ now | date }}',
        ]);

        expect(result.value).toEqual([
            '{% uuid %}',
            '{% uuid %}',
            '{{ _.a.b }}',
            'x {{ now | date }}',
        ]);
        expect(result.notes).toEqual([
            degradation('templateUnsupported', { template: '{% uuid %}' }),
            degradation('templateUnsupported', { template: '{{ _.a.b }}' }),
            degradation('templateUnsupported', { template: '{{ now | date }}' }),
        ]);
    });

    it('does not count a reference as a template', () => {
        expect(withTemplates('{{plain}} and {{ _.other }}').notes).toEqual([]);
    });
});
