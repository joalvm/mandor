import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RedirectList } from '../../../src/renderer/response/RedirectList.js';

import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

describe('the redirects the send followed', () => {
    it('is a region named for them, with one item per hop in the order they happened', () => {
        render(
            <RedirectList
                redirects={[
                    {
                        from: 'http://a.test',
                        status: 301,
                        strippedHeaders: [],
                        to: 'https://a.test',
                    },
                    {
                        from: 'https://a.test',
                        status: 302,
                        strippedHeaders: [],
                        to: 'https://b.test',
                    },
                ]}
            />,
            { wrapper: AppProviders },
        );

        const hops = within(screen.getByRole('region', { name: 'Redirects' })).getAllByRole(
            'listitem',
        );

        expect(hops.map((hop) => hop.textContent)).toEqual([
            '301 → https://a.test',
            '302 → https://b.test',
        ]);
    });

    it('names the headers a hop did not carry along', () => {
        render(
            <RedirectList
                redirects={[
                    {
                        from: 'https://a.test',
                        status: 307,
                        strippedHeaders: ['authorization', 'cookie'],
                        to: 'https://b.test',
                    },
                ]}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByText('Headers removed: authorization, cookie')).toBeVisible();
    });

    it('says nothing of headers on a hop that kept them all', () => {
        render(
            <RedirectList
                redirects={[
                    {
                        from: 'https://a.test',
                        status: 301,
                        strippedHeaders: [],
                        to: 'https://b.test',
                    },
                ]}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.queryByText(/Headers removed/u)).toBeNull();
    });

    it('keeps every hop even when two share a source', () => {
        render(
            <RedirectList
                redirects={[
                    {
                        from: 'https://a.test',
                        status: 301,
                        strippedHeaders: [],
                        to: 'https://a.test/1',
                    },
                    {
                        from: 'https://a.test',
                        status: 301,
                        strippedHeaders: [],
                        to: 'https://a.test/2',
                    },
                ]}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
});
