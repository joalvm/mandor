import { editor, Uri } from 'monaco-editor/editor/editor.api.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    mountScriptLanguage,
    type ScriptLanguage,
} from '../../../src/editor/monaco/script-language.js';
import type { ScriptService } from '../../../src/editor/monaco/script-service.js';

const IDLE_MS = 1_000;

let models = 0;

let mounted: ScriptLanguage | undefined;

function modelOf(language: string): editor.ITextModel {
    models += 1;

    return editor.createModel('', language, Uri.parse(`inmemory://mandor/life-${String(models)}`));
}

/** What the queued answers of a loaded service did, once they ran. */
async function settled(): Promise<void> {
    for (let turn = 0; turn < 5; turn += 1) {
        await Promise.resolve();
    }
}

/** A language over a service the test holds, loaded the moment it is asked for. */
function mount(): { load: ReturnType<typeof vi.fn>; service: ScriptService } {
    const service: ScriptService = { declare: vi.fn(), dispose: vi.fn(), forget: vi.fn() };
    const load = vi.fn(() => Promise.resolve(service));

    mounted = mountScriptLanguage(load, IDLE_MS);

    return { load, service };
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
    mounted?.dispose();
    mounted = undefined;
    editor.getModels().forEach((model) => {
        model.dispose();
    });
    vi.useRealTimers();
});

describe('the life of the service of scripts', () => {
    it('comes up with the first script, once, and with no other text', () => {
        const { load } = mount();

        modelOf('json');

        expect(load).not.toHaveBeenCalled();

        modelOf('script');
        modelOf('script');

        expect(load).toHaveBeenCalledOnce();
    });

    it('hands the service what each script is read against, before it ran or after', async () => {
        const { service } = mount();
        const first = modelOf('script');

        mounted?.declare(first, 'first');
        await settled();

        const second = modelOf('script');

        mounted?.declare(second, 'second');
        await settled();

        expect(service.declare).toHaveBeenCalledWith(first.uri, 'first');
        expect(service.declare).toHaveBeenCalledWith(second.uri, 'second');
    });

    it('hands nothing of a declaration let go of before the service came up', async () => {
        const { service } = mount();
        const model = modelOf('script');

        mounted?.declare(model, 'gone').dispose();
        await settled();

        expect(service.declare).not.toHaveBeenCalled();
    });

    /** It weighs megabytes: a window with no script open carries none of them for long. */
    it('stops a while after the last script closes, and forgets each as it goes', async () => {
        const { service } = mount();
        const first = modelOf('script');
        const second = modelOf('script');

        await settled();
        first.dispose();
        vi.advanceTimersByTime(IDLE_MS);
        await settled();

        expect(service.forget).toHaveBeenCalledWith(first.uri);
        expect(service.dispose).not.toHaveBeenCalled();

        second.dispose();
        vi.advanceTimersByTime(IDLE_MS - 1);
        await settled();

        expect(service.dispose).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1);
        await settled();

        expect(service.dispose).toHaveBeenCalledOnce();
    });

    it('stays up for a script opened in the pause, and comes up again after it stopped', async () => {
        const { load, service } = mount();

        modelOf('script').dispose();
        vi.advanceTimersByTime(IDLE_MS / 2);
        modelOf('script').dispose();
        vi.advanceTimersByTime(IDLE_MS / 2);
        await settled();

        expect(service.dispose).not.toHaveBeenCalled();

        vi.advanceTimersByTime(IDLE_MS / 2);
        await settled();
        modelOf('script');

        expect(service.dispose).toHaveBeenCalledOnce();
        expect(load).toHaveBeenCalledTimes(2);
    });

    it('lets go of a text that stops being a script', async () => {
        const { service } = mount();
        const model = modelOf('script');

        await settled();
        editor.setModelLanguage(model, 'plaintext');
        vi.advanceTimersByTime(IDLE_MS);
        await settled();

        expect(service.forget).toHaveBeenCalledWith(model.uri);
        expect(service.dispose).toHaveBeenCalledOnce();
    });

    it('hands nothing to a service that came up after the window let it go', async () => {
        const service: ScriptService = { declare: vi.fn(), dispose: vi.fn(), forget: vi.fn() };
        let arrive: (ready: ScriptService) => void = () => undefined;

        mounted = mountScriptLanguage(
            () =>
                new Promise((resolve) => {
                    arrive = resolve;
                }),
            IDLE_MS,
        );
        mounted.declare(modelOf('script'), 'late');
        mounted.dispose();
        arrive(service);
        await settled();

        expect(service.declare).not.toHaveBeenCalled();
        expect(service.dispose).toHaveBeenCalledOnce();
    });

    /** The window the tests of the apps draw in has no threads: scripts get their grammar alone. */
    it('starts nothing where there is nothing to load it with', () => {
        mounted = mountScriptLanguage(null, IDLE_MS);

        expect(() => {
            modelOf('script').dispose();
        }).not.toThrow();
    });
});

describe('the grammar of scripts', () => {
    beforeEach(() => {
        vi.useRealTimers();
    });

    it('colours a script as the JavaScript it is', async () => {
        modelOf('script');

        await expect
            .poll(() => editor.tokenize('const a = 1;', 'script')[0]?.[0]?.type)
            .toBe('keyword.js');
    });
});
