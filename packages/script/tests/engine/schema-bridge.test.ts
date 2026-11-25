import { compileSchema, loadSchemaChecker } from '@mandor/validate';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { HOST_SCHEMA, schemaCheckOf } from '../../src/engine/schema-bridge.js';
import { closeSession, newSession } from '../../src/engine/session.js';
import { newWasmModule, type WasmModule } from '../../src/engine/wasm-module.js';

const SCHEMA = '{"type":"object","required":["id"],"properties":{"id":{"type":"number"}}}';

// The checker is there before any test runs: a read before it loads is what the double answers.
vi.mock(import('@mandor/validate'), async (original) => {
    const real = await original();

    return { ...real, compileSchema: vi.fn(real.compileSchema) };
});

let wasm: WasmModule;

beforeAll(async () => {
    wasm = await newWasmModule();
});

/** What the function the session gives the guest answers to `call`, as text. */
function guestAnswer(call: string): string {
    const session = newSession(wasm, 1000, {});
    const result = session.context.evalCode(
        `(() => { try { return ${call}; } catch (e) { return e.name + ': ' + e.message; } })()`,
    );
    const handle = session.context.unwrapResult(result);
    const text = session.context.getString(handle);

    handle.dispose();
    closeSession(session);

    return text;
}

describe('schemaCheckOf', () => {
    it('says the schema cannot be read while the checker has not loaded', () => {
        vi.mocked(compileSchema).mockReturnValueOnce({ ok: false, waiting: true });

        expect(JSON.parse(schemaCheckOf(SCHEMA, '{"id":7}'))).toEqual({
            unreadable: 'the schema checker has not loaded',
        });
    });

    it('answers no issue for a value that meets the schema', async () => {
        await loadSchemaChecker();

        expect(JSON.parse(schemaCheckOf(SCHEMA, '{"id":7}'))).toEqual({ issues: [] });
    });

    it('words each issue as Postman does: data, the path, the message', async () => {
        await loadSchemaChecker();

        expect(JSON.parse(schemaCheckOf(SCHEMA, '{"id":"7"}'))).toEqual({
            issues: ['data/id must be number'],
        });
    });

    it('says why a text is no schema', async () => {
        await loadSchemaChecker();

        const answer = JSON.parse(schemaCheckOf('{', '{}')) as { unreadable?: unknown };

        expect(typeof answer.unreadable).toBe('string');
    });
});

describe('addSchemaCheck', () => {
    it('gives the guest the check under its name, two texts in and one out', async () => {
        await loadSchemaChecker();

        expect(JSON.parse(guestAnswer(`${HOST_SCHEMA}('${SCHEMA}', '{"id":7}')`))).toEqual({
            issues: [],
        });
    });

    it('throws at the guest that passes anything but two texts', () => {
        expect(guestAnswer(`${HOST_SCHEMA}({}, '{}')`)).toBe(
            'Error: A schema check reads two texts',
        );
        expect(guestAnswer(`${HOST_SCHEMA}('{}')`)).toBe('Error: A schema check reads two texts');
        expect(guestAnswer(`${HOST_SCHEMA}('{}', 7)`)).toBe(
            'Error: A schema check reads two texts',
        );
    });
});
