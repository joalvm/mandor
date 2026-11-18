import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useExampleDrag } from '../src/hooks/useExampleDrag.js';
import { carriedExampleIn, type CarriedExample } from '../src/lib/example-drop.js';

const CARRIED: CarriedExample = {
    fromPath: 'pedidos/crear',
    itemKind: 'request',
    resource: 'creado',
};

function ExampleRow() {
    const [element, setElement] = useState<HTMLElement | null>(null);

    useExampleDrag(element, CARRIED);

    return <button ref={setElement} type="button" />;
}

afterEach(() => {
    cleanup();
});

describe('the row of an example as something to take (useExampleDrag)', () => {
    it('carries which example it is and the item it sits under', async () => {
        const carried: CarriedExample[] = [];
        const stop = monitorForElements({
            onGenerateDragPreview: ({ source }) => {
                const example = carriedExampleIn(source.data);

                if (example !== null) {
                    carried.push(example);
                }
            },
        });

        render(<ExampleRow />);

        const row = screen.getByRole('button');
        // pragmatic-drag-and-drop refuses a drag event without dataTransfer.
        const dataTransfer = {
            getData: () => '',
            setData: () => undefined,
            setDragImage: () => undefined,
        };

        await act(async () => {
            fireEvent.dragStart(row, { dataTransfer });
            fireEvent.dragEnd(row, { dataTransfer });
            await Promise.resolve();
        });

        stop();

        expect(carried).toEqual([CARRIED]);
    });

    it('stops being something to take when the row leaves', () => {
        const { unmount } = render(<ExampleRow />);
        const row = screen.getByRole('button');

        expect(row.getAttribute('draggable')).toBe('true');

        unmount();

        expect(row.getAttribute('draggable')).toBeNull();
    });
});
