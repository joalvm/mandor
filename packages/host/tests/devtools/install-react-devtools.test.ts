import { describe, expect, it, vi } from 'vitest';

import { installReactDevTools } from '../../src/devtools/install-react-devtools.js';

function deps(overrides: Partial<Parameters<typeof installReactDevTools>[0]> = {}) {
    const load = vi.fn(() => Promise.resolve());
    const log = vi.fn();

    return {
        load,
        log,
        environment: (name: string): string | undefined =>
            name === 'MANDOR_REACT_DEVTOOLS' ? undefined : undefined,
        ...overrides,
    };
}

describe('installing the React DevTools extension', () => {
    it('loads the extension the environment variable points at', async () => {
        const spy = deps({
            environment: (name) => (name === 'MANDOR_REACT_DEVTOOLS' ? '/ext/react' : undefined),
        });

        await installReactDevTools(spy);

        expect(spy.load).toHaveBeenCalledOnce();
        expect(spy.load).toHaveBeenCalledWith('/ext/react');
        expect(spy.log).not.toHaveBeenCalled();
    });

    it('loads nothing when the variable is unset', async () => {
        const spy = deps();

        await installReactDevTools(spy);

        expect(spy.load).not.toHaveBeenCalled();
    });

    /**
     * A missing or broken extension is a note for the developer, never a reason to refuse
     * starting the app.
     */
    it('writes the failure down and moves on when the extension cannot load', async () => {
        const spy = deps({
            environment: (name) => (name === 'MANDOR_REACT_DEVTOOLS' ? '/ext/missing' : undefined),
            load: vi.fn(() => Promise.reject(new Error('no extension there'))),
        });

        await expect(installReactDevTools(spy)).resolves.toBeUndefined();
        expect(spy.log).toHaveBeenCalledOnce();
    });
});
