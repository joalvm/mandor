import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { GraphqlErrorList } from '../../../src/renderer/response/GraphqlErrorList.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

describe('the errors a graphql answer carried', () => {
    it('lists each message, in the order the server gave them', () => {
        render(<GraphqlErrorList errors={{ count: 2, messages: ['no such user', 'denied'] }} />, {
            wrapper: AppProviders,
        });

        const items = screen.getAllByRole('listitem');

        expect(screen.getByRole('list', { name: 'GraphQL errors' })).toBeVisible();
        expect(items.map((item) => item.textContent)).toEqual(['no such user', 'denied']);
    });

    it('says how many more there were than the ones kept', () => {
        render(<GraphqlErrorList errors={{ count: 25, messages: ['a', 'b'] }} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByText('23 more not shown')).toBeVisible();
    });

    it('does not say "more" when every message is there', () => {
        render(<GraphqlErrorList errors={{ count: 1, messages: ['a'] }} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByText(/more not shown/)).toBeNull();
    });
});
