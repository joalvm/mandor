import { describe, expect, it } from 'vitest';

import { withReferences } from '../../../src/insomnia/export/reference-of.js';

describe('withReferences', () => {
    it('writes the references the way Insomnia does', () => {
        expect(withReferences('{{baseUrl}}/pets/{{ id-2 }}/{{region}}')).toBe(
            '{{ _.baseUrl }}/pets/{{ id-2 }}/{{ _.region }}',
        );
    });

    it('leaves a dynamic variable alone: it is not a name of an environment', () => {
        expect(withReferences('{{$guid}} {{ _.already }}')).toBe('{{$guid}} {{ _.already }}');
    });

    it('rewrites inside lists and objects, and leaves other values alone', () => {
        const value = { url: '{{a}}', rows: ['{{b}}', 3, true, null], deep: { x: '{{c}}' } };

        expect(withReferences(value)).toEqual({
            url: '{{ _.a }}',
            rows: ['{{ _.b }}', 3, true, null],
            deep: { x: '{{ _.c }}' },
        });
    });
});
