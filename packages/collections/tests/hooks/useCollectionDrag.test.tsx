import {
    draggable,
    monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter';
import { SendIcon } from '@mandor/icons';
import { shellStore, originName } from '@mandor/shell';
import type { CollectionNode } from '@mandor/schema';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { collectionStore } from '../../src/collection-store.js';
import { useCollectionDrag } from '../../src/hooks/useCollectionDrag.js';
import { dataOfCarriedExample, type CarriedExample } from '../../src/lib/example-drop.js';
import { itemResource } from '../../src/lib/item-resource.js';

import { declareItemKind } from '../support/declare-item-kind.js';

const WORKSPACE = 'events';
const CREADO: CollectionNode = {
    kind: 'item',
    itemKind: 'message',
    name: 'Pedido creado',
    path: 'pedidos/pedido-creado',
    tags: [],
};
const PAGADO: CollectionNode = { ...CREADO, name: 'Pedido pagado', path: 'pedidos/pedido-pagado' };
const CARRIED: CarriedExample = {
    fromPath: 'envios/envio-creado',
    itemKind: 'message',
    resource: 'creado',
};

/** pragmatic-drag-and-drop refuses a drag event without dataTransfer. */
const DATA_TRANSFER = {
    getData: () => '',
    setData: () => undefined,
    setDragImage: () => undefined,
};

/** A row of the tree as the hook sees it: something to take and something to drop on. */
function Row({ node }: { node: CollectionNode }) {
    const [element, setElement] = useState<HTMLElement | null>(null);
    const drop = useCollectionDrag(element, {
        level: 1,
        mode: 'standard',
        node,
        workspaceId: WORKSPACE,
    });

    return (
        <button data-drop={drop ?? 'none'} ref={setElement} type="button">
            {node.name}
        </button>
    );
}

/** Whatever carries an example: a source that is not a row of the tree. */
function ExampleSource() {
    const [element, setElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (element === null) {
            return undefined;
        }

        return draggable({ element, getInitialData: () => dataOfCarriedExample(CARRIED) });
    }, [element]);

    return (
        <button ref={setElement} type="button">
            Example
        </button>
    );
}

/** The gestures land inside act, and the view defers its drag work a frame. */
async function gesture(steps: () => void): Promise<void> {
    await act(async () => {
        steps();
        await new Promise((resolve) => requestAnimationFrame(resolve));
    });
}

function dropOn(name: string): string | null {
    return screen.getByRole('button', { name }).getAttribute('data-drop');
}

let unregister: () => void = () => undefined;
const move = vi.fn(() => Promise.resolve());

beforeEach(() => {
    vi.restoreAllMocks();
    move.mockClear();
    collectionStore.getState().reset();
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: WORKSPACE });
    unregister = declareItemKind({
        id: 'message',
        component: SendIcon,
        examples: {
            duplicate: () => Promise.resolve(),
            move,
            open: () => undefined,
            remove: () => Promise.resolve(),
            rename: () => Promise.resolve(),
        },
        newLabel: 'collections:newItem',
    });
});

afterEach(() => {
    cleanup();
    unregister();
    collectionStore.getState().reset();
    shellStore.getState().reset();
});

/** The paths the next drag of the window carries, read off the drag itself. */
function watchCarried(): { paths: unknown[]; stop: () => void } {
    const paths: unknown[] = [];
    const stop = monitorForElements({
        onGenerateDragPreview: ({ source }) => {
            paths.push(source.data['paths']);
        },
    });

    return { paths, stop };
}

describe('the row as something to take (useCollectionDrag)', () => {
    it('carries the path of the row it was taken by and nothing else', async () => {
        const watch = watchCarried();

        render(<Row node={CREADO} />);
        await gesture(() => {
            fireEvent.dragStart(screen.getByRole('button'), { dataTransfer: DATA_TRANSFER });
        });
        await gesture(() => {
            fireEvent.dragEnd(screen.getByRole('button'), { dataTransfer: DATA_TRANSFER });
        });
        watch.stop();

        expect(watch.paths).toEqual([['pedidos/pedido-creado']]);
    });

    it('carries every path taken when the row is among them, in the order the tree stands', async () => {
        const watch = watchCarried();

        collectionStore.getState().setSelected(['pedidos/pedido-creado', 'pedidos/pedido-pagado']);
        render(<Row node={PAGADO} />);
        await gesture(() => {
            fireEvent.dragStart(screen.getByRole('button'), { dataTransfer: DATA_TRANSFER });
        });
        await gesture(() => {
            fireEvent.dragEnd(screen.getByRole('button'), { dataTransfer: DATA_TRANSFER });
        });
        watch.stop();

        expect(watch.paths).toEqual([['pedidos/pedido-creado', 'pedidos/pedido-pagado']]);
    });

    it('stops being something to take when the row leaves', () => {
        const { unmount } = render(<Row node={CREADO} />);
        const row = screen.getByRole('button');

        expect(row.getAttribute('draggable')).toBe('true');

        unmount();

        expect(row.getAttribute('draggable')).toBeNull();
    });
});

describe('the row as something to drop on (useCollectionDrag)', () => {
    it('marks nothing while nothing is over it', () => {
        render(<Row node={CREADO} />);

        expect(dropOn('Pedido creado')).toBe('none');
    });

    it('fills the row of an item of the same kind under an example that is over it', async () => {
        render(
            <>
                <ExampleSource />
                <Row node={CREADO} />
            </>,
        );

        const row = screen.getByRole('button', { name: 'Pedido creado' });

        await gesture(() => {
            fireEvent.dragStart(screen.getByRole('button', { name: 'Example' }), {
                dataTransfer: DATA_TRANSFER,
            });
            fireEvent.dragEnter(row, { dataTransfer: DATA_TRANSFER });
            fireEvent.dragOver(row, { dataTransfer: DATA_TRANSFER });
        });

        expect(dropOn('Pedido creado')).toBe('inside');

        // A drag left halfway would swallow the next test's first one.
        await gesture(() => {
            fireEvent.dragEnd(screen.getByRole('button', { name: 'Example' }), {
                dataTransfer: DATA_TRANSFER,
            });
        });
    });

    it('carries the example to the item it was let go on, and clears the mark', async () => {
        render(
            <>
                <ExampleSource />
                <Row node={CREADO} />
            </>,
        );

        const row = screen.getByRole('button', { name: 'Pedido creado' });

        await gesture(() => {
            fireEvent.dragStart(screen.getByRole('button', { name: 'Example' }), {
                dataTransfer: DATA_TRANSFER,
            });
            fireEvent.dragEnter(row, { dataTransfer: DATA_TRANSFER });
            fireEvent.dragOver(row, { dataTransfer: DATA_TRANSFER });
            fireEvent.drop(row, { dataTransfer: DATA_TRANSFER });
        });

        expect(move).toHaveBeenCalledWith(
            'creado',
            itemResource(originName(), WORKSPACE, 'pedidos/pedido-creado'),
        );
        expect(dropOn('Pedido creado')).toBe('none');
    });

    it('takes no example from the item it came from', async () => {
        render(
            <>
                <ExampleSource />
                <Row node={{ ...CREADO, path: CARRIED.fromPath }} />
            </>,
        );

        const row = screen.getByRole('button', { name: 'Pedido creado' });

        await gesture(() => {
            fireEvent.dragStart(screen.getByRole('button', { name: 'Example' }), {
                dataTransfer: DATA_TRANSFER,
            });
            fireEvent.dragEnter(row, { dataTransfer: DATA_TRANSFER });
            fireEvent.dragOver(row, { dataTransfer: DATA_TRANSFER });
            fireEvent.drop(row, { dataTransfer: DATA_TRANSFER });
        });

        expect(move).not.toHaveBeenCalled();
        expect(dropOn('Pedido creado')).toBe('none');
    });
});
