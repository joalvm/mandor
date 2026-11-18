import { describe, expect, it } from 'vitest';

import { importedScriptSchema } from '../../src/script/imported-script-schema.js';

const VALID = {
    event: 'onBeforeRequest',
    dialect: 'postman',
    source: 'pm.environment.set("a", 1)',
};

describe('the schema of an imported script', () => {
    it('accepts an event, a dialect and the source text', () => {
        expect(importedScriptSchema.parse(VALID)).toEqual(VALID);
    });

    it('refuses an event Mandor has no hook for', () => {
        expect(importedScriptSchema.safeParse({ ...VALID, event: 'onConnect' }).success).toBe(
            false,
        );
    });

    it('refuses a dialect nobody shims', () => {
        expect(importedScriptSchema.safeParse({ ...VALID, dialect: 'bruno' }).success).toBe(false);
    });

    it('refuses a key it does not know', () => {
        expect(importedScriptSchema.safeParse({ ...VALID, enabled: true }).success).toBe(false);
    });
});
