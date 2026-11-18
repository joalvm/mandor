import { describe, expect, it } from 'vitest';

import { variableNameSchema } from '../../src/index.js';

function accepts(name: string): boolean {
    return variableNameSchema.safeParse(name).success;
}

describe('variableNameSchema', () => {
    it('accepts a plain name', () => {
        expect(accepts('token')).toBe(true);
    });

    it('accepts dots, dashes and underscores inside the name', () => {
        expect(accepts('api_key.v2-beta')).toBe(true);
    });

    /** What `{{ }}` would capture: a name with a space can never sit inside `{{...}}`. */
    it('rejects a name with a space inside', () => {
        expect(accepts('token name')).toBe(false);
        expect(accepts(' token')).toBe(false);
        expect(accepts('token ')).toBe(false);
    });

    it('rejects braces, which would nest one placeholder inside another', () => {
        expect(accepts('{{token}}')).toBe(false);
        expect(accepts('tok{en')).toBe(false);
    });

    /** The `$` prefix is reserved for dynamic variables like `{{$uuid}}`, never declared. */
    it('rejects a name with the dynamic prefix', () => {
        expect(accepts('$uuid')).toBe(false);
    });

    it('rejects an empty name', () => {
        expect(accepts('')).toBe(false);
    });
});
