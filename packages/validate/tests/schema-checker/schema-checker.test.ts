import { describe, expect, it, vi } from 'vitest';

import type * as CompileModule from '../../src/compile-schema/compile-schema.js';
import type * as CheckerModule from '../../src/schema-checker/schema-checker.js';
import type * as PayloadModule from '../../src/schema-generation/apply-generated-payload.js';

const OBJECT = '{"type": "object"}';
const NAMED = '{"type": "object", "properties": {"name": {"type": "string"}}}';

type Checker = typeof CheckerModule;
type Compile = typeof CompileModule;
type Payload = typeof PayloadModule;

/**
 * The package as a window that just opened finds it: every test file starts with the checker
 * loaded, so these read a copy of their own, where nothing has asked for it yet.
 */
async function freshWindow(): Promise<{ checker: Checker; compile: Compile; payload: Payload }> {
    vi.resetModules();

    return {
        checker: await import('../../src/schema-checker/schema-checker.js'),
        compile: await import('../../src/compile-schema/compile-schema.js'),
        payload: await import('../../src/schema-generation/apply-generated-payload.js'),
    };
}

describe('the schema checker, loaded apart (schema-checker, checker-library)', () => {
    /** It weighs a seventh of the window: a window that reads no schema never evaluates it. */
    it('leaves the library unevaluated until something asks for the checker', async () => {
        const evaluated = { library: false };

        vi.doMock('json-schema-library', async (original) => {
            evaluated.library = true;

            return original();
        });

        const { checker } = await freshWindow();

        await import('../../src/index.js');
        expect(evaluated.library).toBe(false);

        await checker.loadSchemaChecker();
        vi.doUnmock('json-schema-library');
        expect(evaluated.library).toBe(true);
    });

    it('reads a schema as waiting before the checker loads, and answers once it arrives', async () => {
        const { checker, compile } = await freshWindow();

        expect(checker.loadedSchemaChecker()).toBeNull();
        expect(compile.compileSchema(OBJECT)).toEqual({ ok: false, waiting: true });

        await checker.loadSchemaChecker();

        expect(compile.compileSchema(OBJECT).ok).toBe(true);
    });

    /** Text that is no JSON is broken whatever reads it: that answer needs no checker. */
    it('still refuses a text that is not JSON before the checker loads', async () => {
        const { compile } = await freshWindow();

        expect(compile.compileSchema('{type: object}')).toMatchObject({
            ok: false,
            message: /JSON/,
        });
    });

    it('tells who listens that the checker arrived, and stops telling who left', async () => {
        const { checker } = await freshWindow();
        const heard: string[] = [];
        const stay = checker.onSchemaCheckerLoaded(() => heard.push('stay'));
        const leave = checker.onSchemaCheckerLoaded(() => heard.push('leave'));

        leave();
        await checker.loadSchemaChecker();
        stay();

        expect(heard).toEqual(['stay']);
    });

    it('runs what needs a verdict once the checker arrives, and at once when it is there', async () => {
        const { checker } = await freshWindow();
        const ran: string[] = [];

        checker.withSchemaChecker(() => ran.push('first'));
        expect(ran).toEqual([]);

        await checker.loadSchemaChecker();
        checker.withSchemaChecker(() => ran.push('second'));

        expect(ran).toEqual(['first', 'second']);
    });

    /** Read as met while the checker loads, a body the schema refuses would be replaced unasked. */
    it('asks before replacing a body its schema refuses, even before the checker loads', async () => {
        const { checker, payload } = await freshWindow();
        const applied: string[] = [];
        const notify = vi.fn();

        payload.applyGeneratedPayload({
            apply: (value) => applied.push(value),
            ask: { notify, words: (key) => key },
            generated: '{"name": "Ada"}',
            payload: '{"name": 7}',
            schema: NAMED,
        });
        await checker.loadSchemaChecker();

        expect(applied).toEqual([]);
        expect(notify).toHaveBeenCalledOnce();
    });
});
