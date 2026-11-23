import type { RequestScripts } from '@mandor/schema';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useDeclaredInScripts } from '../../src/hooks/useDeclaredInScripts.js';

function declaring(source: string): RequestScripts {
    return { onResponse: { source } };
}

afterEach(() => {
    cleanup();
});

describe('the names the scripts of a place declare, while somebody types (useDeclaredInScripts)', () => {
    it('gives the names of every level', () => {
        const { result } = renderHook(() =>
            useDeclaredInScripts([declaring('mandor.variables.set("id", 1);'), undefined]),
        );

        expect(result.current).toEqual(['id']);
    });

    it('stays the same list while a key changes no name', () => {
        const { rerender, result } = renderHook(
            ({ source }: { source: string }) => useDeclaredInScripts([declaring(source)]),
            { initialProps: { source: 'mandor.variables.set("id", 1);' } },
        );
        const first = result.current;

        rerender({ source: 'mandor.variables.set("id", 12);' });

        expect(result.current).toBe(first);

        rerender({ source: 'mandor.variables.set("id", 12); mandor.variables.set("next", 1);' });

        expect(result.current).toEqual(['id', 'next']);
    });

    it('is empty where nothing declares a name', () => {
        const { result } = renderHook(() => useDeclaredInScripts([declaring('a()')]));

        expect(result.current).toEqual([]);
    });
});
