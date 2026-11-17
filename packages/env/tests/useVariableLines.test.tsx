import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useVariableLines } from '../src/hooks/useVariableLines.js';

const HOST = { enabled: true, name: 'host', secret: false, value: 'api.test' };
const PORT = { enabled: false, name: 'port', secret: false, value: '80' };

describe('the lines of a list of variables', () => {
    it('keeps the ids the table hands back, each with its own line', () => {
        const { result, rerender } = renderHook(({ variables }) => useVariableLines(variables), {
            initialProps: { variables: [HOST, PORT] },
        });
        let adopted: unknown;

        act(() => {
            adopted = result.current.adopt([
                { disabled: true, id: '7', name: 'port', value: '80' },
                { disabled: false, id: '3', name: 'host', value: 'api.test' },
            ]);
        });
        rerender({ variables: [PORT, HOST] });

        expect(adopted).toEqual([PORT, HOST]);
        expect(result.current.lines.map((line) => line.id)).toEqual(['7', '3']);
    });

    it('names a list it has not been handed back yet by position', () => {
        const { result } = renderHook(() => useVariableLines([HOST, PORT]));

        expect(result.current.lines.map((line) => line.id)).toEqual(['0', '1']);
    });
});
