import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CollectionRowAction } from '../src/components/sidebar/CollectionRowAction.js';
import { CollectionRowActions } from '../src/components/sidebar/CollectionRowActions.js';

afterEach(() => {
    cleanup();
});

describe('the lines drawn in the menu of a row (CollectionRowActions)', () => {
    it('draws the lines declared for its kind, in the order the app wrote them', () => {
        render(
            <>
                <CollectionRowAction id="export" kind="collection">
                    <span>Export</span>
                </CollectionRowAction>
                <CollectionRowAction id="tidy" kind="folder">
                    <span>Tidy</span>
                </CollectionRowAction>
                <CollectionRowAction id="import" kind="collection">
                    <span>Import</span>
                </CollectionRowAction>
                <CollectionRowActions kind="collection" />
            </>,
        );

        expect(screen.getAllByText(/./u).map((line) => line.textContent)).toEqual([
            'Export',
            'Import',
        ]);
    });

    it('draws nothing when no line was declared for its kind', () => {
        const { container } = render(
            <>
                <CollectionRowAction id="export" kind="collection">
                    <span>Export</span>
                </CollectionRowAction>
                <CollectionRowActions kind="folder" />
            </>,
        );

        expect(container).toBeEmptyDOMElement();
    });
});
