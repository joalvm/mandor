import { describe, expect, it } from 'vitest';

import { newEngine } from '../../src/engine/new-engine.js';
import { answeringLink, inputOf, okReply } from './guest/support.js';

describe('newEngine', () => {
    it('runs a script and gives what it did', async () => {
        const engine = await newEngine();

        expect(
            await engine.runScript(inputOf('console.log("hi"); mandor.variables.set("a", "1");')),
        ).toEqual({
            ok: true,
            output: {
                effects: [{ kind: 'var', name: 'a', value: '1' }],
                logs: [{ level: 'log', text: 'hi' }],
                tests: [],
            },
        });
    });

    it('runs one script after another on the same instance, each from a clean global', async () => {
        const engine = await newEngine();

        await engine.runScript(inputOf('globalThis.kept = "yes";'));
        const second = await engine.runScript(inputOf('console.log(typeof globalThis.kept);'));

        expect(second).toMatchObject({ ok: true, output: { logs: [{ text: 'undefined' }] } });
    });

    it('lets a script send a request over the link it is given', async () => {
        const engine = await newEngine();
        const link = answeringLink(() => okReply('answer'));

        expect(
            await engine.runScript(
                inputOf(
                    "const r = await mandor.sendRequest({ url: 'https://a.test' }); console.log(r.text());",
                ),
                link,
            ),
        ).toMatchObject({ ok: true, output: { logs: [{ text: 'answer' }] } });
        expect(link.sent).toHaveLength(1);
    });

    it('gives an engine that survives a script that threw', async () => {
        const engine = await newEngine();

        expect(await engine.runScript(inputOf('throw new Error("x")'))).toMatchObject({
            ok: true,
            output: { error: { message: 'x' } },
        });
        expect((await engine.runScript(inputOf('console.log("after")'))).ok).toBe(true);
    });
});
