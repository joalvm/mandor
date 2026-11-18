import { allByPart, byPart } from '@mandor/ui/testing';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { boxOf, renderTree, row, texts, unfold } from '../support/choice-tree-harness.js';

describe('the choice tree', () => {
    it('keeps one height whatever is folded, so the dialog never resizes under the user', () => {
        renderTree();

        expect(byPart('choice-tree-viewport')).toHaveClass('h-96');
    });

    it('puts the title on top, with the top level under it and the branches folded', () => {
        renderTree();

        expect(texts()).toEqual(['Everything', 'queues', 'shop']);
    });

    it('draws the chevron of every branch, so a fold is never a guess', () => {
        renderTree();

        for (const line of allByPart('tree-line')) {
            expect(line).toHaveAttribute('data-chevrons');
        }
    });

    it('opens a branch with the side arrows', () => {
        renderTree();

        unfold('shop');

        expect(texts()).toEqual(['Everything', 'queues', 'shop', 'orders', 'health']);
    });

    it('folds and opens a branch with a press on its row, which marks nothing', () => {
        const onChange = renderTree();

        fireEvent.click(row('shop'));

        expect(texts()).toEqual(['Everything', 'queues', 'shop', 'orders', 'health']);

        fireEvent.click(row('shop'));

        expect(texts()).toEqual(['Everything', 'queues', 'shop']);
        expect(onChange).not.toHaveBeenCalled();
    });

    it('marks a branch with space on its row, and with its box', () => {
        renderTree();

        fireEvent.keyDown(row('shop'), { key: ' ' });

        expect(boxOf('shop')).toHaveAttribute('aria-checked', 'false');

        fireEvent.click(boxOf('shop'));

        expect(boxOf('shop')).toHaveAttribute('aria-checked', 'true');
        expect(texts()).toEqual(['Everything', 'queues', 'shop']);
    });

    it('reads a branch as mixed when its leaves disagree, and every branch above it with it', () => {
        renderTree(['place', 'health']);

        expect(boxOf('Everything')).toHaveAttribute('aria-checked', 'mixed');
        expect(boxOf('shop')).toHaveAttribute('aria-checked', 'mixed');
    });

    it('chooses and clears everything from the title', () => {
        renderTree(['place']);

        fireEvent.click(boxOf('Everything'));

        expect(boxOf('Everything')).toHaveAttribute('aria-checked', 'true');

        fireEvent.click(boxOf('Everything'));

        expect(boxOf('Everything')).toHaveAttribute('aria-checked', 'false');
    });

    it('chooses a leaf from the row itself, not only from the box, and with space', () => {
        renderTree();
        unfold('shop');

        fireEvent.click(row('health'));

        expect(boxOf('health')).toHaveAttribute('aria-checked', 'false');

        fireEvent.keyDown(row('health'), { key: ' ' });

        expect(boxOf('health')).toHaveAttribute('aria-checked', 'true');
    });

    it('leaves a node with a reason where it is, red and with its box out of reach', () => {
        const onChange = renderTree();

        fireEvent.click(boxOf('queues'));
        fireEvent.click(row('queues'));

        expect(boxOf('queues')).toHaveAttribute('disabled');
        expect(boxOf('queues')).toHaveAttribute('aria-checked', 'false');
        expect(row('queues').querySelector('.text-text-error')).not.toBeNull();
        expect(boxOf('Everything')).toHaveAttribute('aria-checked', 'true');
        expect(onChange).not.toHaveBeenCalled();
    });

    /** The tree is one stop of the tabulator, and its marks are reached through their rows. */
    it('keeps every checkbox out of the tab order', () => {
        renderTree();
        unfold('shop');

        const stops = allByPart('checkbox').map((box) => box.getAttribute('tabindex'));

        expect(stops).toHaveLength(5);
        expect(new Set(stops)).toEqual(new Set(['-1']));
    });
});
