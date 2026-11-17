import { ItemProvider } from '@mandor/collections';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExampleStatusMark } from '../../../../../../src/renderer/features/requests/components/examples/ExampleStatusMark.js';

const RESOURCE = 'mandor://local-apis/events/example/acceso/login/Creado';

function markOf(saved: string) {
    render(
        <ItemProvider value={{ resource: RESOURCE, saved }}>
            <ExampleStatusMark />
        </ItemProvider>,
    );

    return screen.getByText(saved);
}

afterEach(cleanup);

describe('the status an example wears in its line', () => {
    it('is green for a success', () => {
        expect(markOf('201')).toHaveClass('text-text-success');
    });

    it('is red for a refusal', () => {
        expect(markOf('404')).toHaveClass('text-text-error');
    });

    it('is the quiet tone for the code that stands for the rest', () => {
        expect(markOf('default')).toHaveClass('text-text-tertiary');
    });
});
