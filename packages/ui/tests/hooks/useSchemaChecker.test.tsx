import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

/**
 * A window that just opened, with the checker not there yet. Every test file starts with it
 * loaded, so this one reads a copy of its own: the hook, the checker and the React that draws
 * them, all fresh.
 */
async function freshWindow() {
    vi.resetModules();

    return {
        react: await import('react'),
        testing: await import('@testing-library/react'),
        useSchemaChecker: (await import('../../src/hooks/useSchemaChecker.js')).useSchemaChecker,
        validate: await import('@mandor/validate'),
    };
}

describe('useSchemaChecker', () => {
    /** A verdict drawn before the checker is none yet: the component draws again when it comes. */
    it('loads the checker for the component that asks, and draws it again once it is there', async () => {
        const { react, testing, useSchemaChecker, validate } = await freshWindow();

        function Harness(): ReactNode {
            return react.createElement('p', null, useSchemaChecker() ? 'checked' : 'waiting');
        }

        testing.render(react.createElement(Harness));

        expect(testing.screen.getByText('waiting')).toBeInTheDocument();

        await testing.act(async () => {
            await validate.loadSchemaChecker();
        });

        expect(testing.screen.getByText('checked')).toBeInTheDocument();
        testing.cleanup();
    });
});
