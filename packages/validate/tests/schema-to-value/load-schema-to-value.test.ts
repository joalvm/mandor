import { describe, expect, it, vi } from 'vitest';

// isolation-policy: the generator loads once per module graph; each test reads a fresh one.
async function freshLoader() {
    vi.resetModules();

    return import('../../src/schema-to-value/load-schema-to-value.js');
}

const SEVEN = '{"type": "integer", "const": 7}';

describe('the generator, loaded the first time a body is generated', () => {
    it('waits for the generator, then generates with it', async () => {
        const { withSchemaToValue } = await freshLoader();
        const generated = await new Promise<string>((resolve) => {
            withSchemaToValue((generate) => {
                resolve(generate(SEVEN));
            });
        });

        expect(generated).toBe('7');
    });

    /** Once it is there a click generates at once: the reader sees the body in the same turn. */
    it('generates at once when the generator is already there', async () => {
        const { loadSchemaToValue, withSchemaToValue } = await freshLoader();
        const loaded = await loadSchemaToValue();
        let generated = '';

        withSchemaToValue((generate) => {
            expect(generate).toBe(loaded);
            generated = generate(SEVEN);
        });

        expect(generated).toBe('7');
    });
});
