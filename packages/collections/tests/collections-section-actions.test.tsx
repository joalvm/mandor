import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CollectionsSectionAction } from '../src/components/sidebar/CollectionsSectionAction.js';
import { CollectionsSectionActions } from '../src/components/sidebar/CollectionsSectionActions.js';

afterEach(() => {
    cleanup();
});

describe('the buttons drawn in the header of the section (CollectionsSectionActions)', () => {
    it('draws what the app declared, in the order it wrote it', () => {
        render(
            <>
                <CollectionsSectionAction id="first">
                    <button type="button">First</button>
                </CollectionsSectionAction>
                <CollectionsSectionAction id="second">
                    <button type="button">Second</button>
                </CollectionsSectionAction>
                <CollectionsSectionActions />
            </>,
        );

        expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
            'First',
            'Second',
        ]);
    });

    it('draws nothing while the app declared nothing', () => {
        const { container } = render(<CollectionsSectionActions />);

        expect(container).toBeEmptyDOMElement();
    });
});
