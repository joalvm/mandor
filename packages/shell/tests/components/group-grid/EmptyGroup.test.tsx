import { byPart } from '@mandor/ui/testing';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GroupWatermark } from '../../../src/components/group-grid/GroupWatermark.js';
import { EmptyGroup } from '../../../src/index.js';

afterEach(() => {
    cleanup();
});

describe('the page of an empty group, declared in the tree', () => {
    it('is drawn in every group with nothing in it while it is mounted', () => {
        const view = render(
            <>
                <EmptyGroup>
                    <p>Seleccione o cree una conexión</p>
                </EmptyGroup>
                <GroupWatermark />
            </>,
        );

        expect(screen.getByText('Seleccione o cree una conexión')).toBeVisible();

        view.rerender(<GroupWatermark />);

        expect(byPart('group-watermark').textContent).toBe('');
    });
});
