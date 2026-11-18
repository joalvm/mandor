import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { KeyValueLine, KeyValuePreset } from '../src/components/key-value/key-value-line.js';
import {
    useKeyValueTableState,
    type KeyValueTableOptions,
} from '../src/components/key-value/useKeyValueTableState.js';

const LINES: readonly KeyValueLine[] = [
    { disabled: false, id: '0', name: 'start', value: '1' },
    { disabled: true, id: '1', name: 'end', value: '2' },
    { disabled: false, id: '2', name: 'token', value: '3' },
];

const PRESET: KeyValuePreset = {
    id: 'web',
    lines: [{ disabled: false, id: 'x', name: 'Accept', value: 'text/html' }],
    name: 'web',
};

function stateOf(options: Partial<KeyValueTableOptions> = {}) {
    const onLinesChange = vi.fn();
    const { result } = renderHook(() =>
        useKeyValueTableState({
            columns: { description: false, value: true },
            environment: undefined,
            lines: LINES,
            onColumnsChange: () => undefined,
            onLinesChange,
            onVariablesChange: () => undefined,
            typed: false,
            ...options,
        }),
    );

    return { onLinesChange, result };
}

describe('the state a table keeps while it stands', () => {
    it('is a table of variables with bulk text and a column menu, without secrets, unless told', () => {
        const { result } = stateOf();
        const { context } = result.current;

        expect(context).toMatchObject({
            bulk: false,
            bulkEdit: true,
            columnMenu: true,
            managing: false,
            secretable: false,
            variables: true,
        });
        expect(context.keyInvalid({ disabled: false, id: '0', name: 'start', value: '' })).toBe(
            false,
        );
    });

    it('takes the extras the owner gives instead of the defaults', () => {
        const { result } = stateOf({ bulkEdit: false, secretable: true, variables: false });

        expect(result.current.context).toMatchObject({
            bulkEdit: false,
            secretable: true,
            variables: false,
        });
    });

    it('edits only the line it is asked to, with the part it is given', () => {
        const { onLinesChange, result } = stateOf();

        result.current.context.editLine('1', { disabled: false, value: 'otro' });

        expect(onLinesChange).toHaveBeenCalledWith([
            LINES[0],
            { ...LINES[1], disabled: false, value: 'otro' },
            LINES[2],
        ]);
    });

    it('removes a line and leaves the rest in the order they were', () => {
        const { onLinesChange, result } = stateOf();

        result.current.context.removeLine('1');

        expect(onLinesChange).toHaveBeenCalledWith([LINES[0], LINES[2]]);
    });

    it('carries a line to the place the pointer lets it go', () => {
        const { onLinesChange, result } = stateOf();

        result.current.context.moveLine('0', 2);

        expect(onLinesChange).toHaveBeenCalledWith([LINES[1], LINES[2], LINES[0]]);
    });

    it('brings a line to life from the empty row, under the next identity, with the text it got', () => {
        const { onLinesChange, result } = stateOf();

        act(() => {
            result.current.context.spawnLine('value', 'nuevo');
        });

        expect(onLinesChange).toHaveBeenCalledWith([
            ...LINES,
            { disabled: false, id: '3', name: '', value: 'nuevo' },
        ]);
    });

    it('takes a preset in whole, and takes none the book does not hold', () => {
        const { onLinesChange, result } = stateOf({ presets: [PRESET] });

        result.current.context.applyPreset('nowhere');
        expect(onLinesChange).not.toHaveBeenCalled();

        result.current.context.applyPreset('web');
        expect(onLinesChange).toHaveBeenCalledWith([
            ...LINES,
            { disabled: false, id: '3', name: 'Accept', value: 'text/html' },
        ]);
    });

    it('shows and hides the rows the app adds, one press at a time', () => {
        const { result } = stateOf();

        act(() => {
            result.current.context.onToggleAuto();
        });
        expect(result.current.context.autoShown).toBe(true);

        act(() => {
            result.current.context.onToggleAuto();
        });
        expect(result.current.context.autoShown).toBe(false);
    });

    it('says the lines in one text on the way in, and spells the draft back on the way out', () => {
        const { onLinesChange, result } = stateOf();

        act(() => {
            result.current.context.onToggleBulk();
        });
        expect(result.current.context.bulk).toBe(true);
        expect(result.current.bulkDraft).toBe('start:1\n//end:2\ntoken:3');

        act(() => {
            result.current.setBulkDraft('start:9\nextra:x');
        });
        act(() => {
            result.current.context.onToggleBulk();
        });

        expect(result.current.context.bulk).toBe(false);
        expect(onLinesChange).toHaveBeenCalledWith([
            { ...LINES[0], value: '9' },
            expect.objectContaining({ disabled: false, name: 'extra', value: 'x' }),
        ]);
    });

    it('opens the book of presets and puts it away', () => {
        const { result } = stateOf({ presets: [PRESET] });

        act(() => {
            result.current.context.openPresets();
        });
        expect(result.current.context.managing).toBe(true);

        act(() => {
            result.current.context.closePresets();
        });
        expect(result.current.context.managing).toBe(false);
    });

    it('holds the carried line while the drag lasts', () => {
        const { result } = stateOf();

        act(() => {
            result.current.context.setDragId('2');
        });
        expect(result.current.context.dragId).toBe('2');

        act(() => {
            result.current.context.setDragId(undefined);
        });
        expect(result.current.context.dragId).toBeUndefined();
    });
});
