import { byPart } from '@mandor/ui/testing';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GroupWatermark } from '../../../src/components/group-grid/GroupWatermark.js';
import { EmptyGroup } from '../../../src/index.js';

afterEach(() => {
    cleanup();
});

describe('what a group with no tab in it shows', () => {
    /** A window that declared nothing leaves the group blank rather than inventing words. */
    it('draws nothing while the window has declared no empty group', () => {
        render(<GroupWatermark />);

        expect(byPart('group-watermark').textContent).toBe('');
        expect(byPart('group-watermark').querySelector("[data-part='card']")).toBeNull();
    });

    it('draws what the window declared for a group with nothing in it', () => {
        render(
            <>
                <EmptyGroup>
                    <p>Seleccione o cree una conexión</p>
                </EmptyGroup>
                <GroupWatermark />
            </>,
        );

        expect(screen.getByText('Seleccione o cree una conexión')).toBeVisible();
    });

    it('lays what the window declared on a card, as the body of a tab', () => {
        render(
            <>
                <EmptyGroup>
                    <p>Seleccione o cree una conexión</p>
                </EmptyGroup>
                <GroupWatermark />
            </>,
        );

        const card = byPart('card');

        expect(byPart('group-watermark')).toContainElement(card);
        expect(card).toContainElement(screen.getByText('Seleccione o cree una conexión'));
    });
});
