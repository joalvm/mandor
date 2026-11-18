import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExampleExpectedTable } from '../../../../../../src/renderer/features/requests/components/examples/ExampleExpectedTable.js';
import { AppProviders } from '../../../../support/app-providers.js';

afterEach(cleanup);

describe('what an example declares, written by hand (ExampleExpectedTable)', () => {
    it('shows the pairs with no switch to send them', () => {
        render(<ExampleExpectedTable onWrite={vi.fn()} pairs={[['x-a', '1']]} title="Headers" />, {
            wrapper: AppProviders,
        });

        expect(screen.getAllByRole('textbox', { name: 'Key' })[0]).toHaveTextContent('x-a');
        expect(screen.queryByRole('checkbox')).toBeNull();
    });

    it('writes a line edited in place', () => {
        const onWrite = vi.fn();

        render(<ExampleExpectedTable onWrite={onWrite} pairs={[['x-a', '1']]} title="Headers" />, {
            wrapper: AppProviders,
        });

        const key = screen.getAllByRole('textbox', { name: 'Key' })[0];

        if (key === undefined) {
            throw new Error('The line has no key field.');
        }

        key.textContent = 'x-b';
        fireEvent.input(key);

        expect(onWrite).toHaveBeenLastCalledWith([['x-b', '1']]);
    });

    it('follows the example when another hand moves it', () => {
        const { rerender } = render(
            <ExampleExpectedTable onWrite={vi.fn()} pairs={[['x-a', '1']]} title="Headers" />,
            { wrapper: AppProviders },
        );

        rerender(<ExampleExpectedTable onWrite={vi.fn()} pairs={[['x-c', '3']]} title="Headers" />);

        expect(screen.getAllByRole('textbox', { name: 'Key' })[0]).toHaveTextContent('x-c');
    });
});
