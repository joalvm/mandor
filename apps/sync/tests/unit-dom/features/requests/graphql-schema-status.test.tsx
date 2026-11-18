import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { buildSchema } from 'graphql';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GraphqlSchemaStatus } from '../../../../src/renderer/features/requests/components/body/GraphqlSchemaStatus.js';
import {
    graphqlSchemaViewOf,
    type GraphqlSchemaView,
} from '../../../../src/renderer/features/requests/lib/graphql-schema-view.js';
import { NO_GRAPHQL_SCHEMA } from '../../support/no-graphql-schema.js';

afterEach(cleanup);

function draw(view: Partial<GraphqlSchemaView>, onRefresh = vi.fn()): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <GraphqlSchemaStatus
                    onRefresh={onRefresh}
                    schema={{ ...graphqlSchemaViewOf(NO_GRAPHQL_SCHEMA.facts), ...view }}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

describe('the status of the schema', () => {
    it('offers to fetch it while there is none, and asks only when pressed', () => {
        const refresh = vi.fn();

        draw({}, refresh);

        expect(screen.getByText('No schema')).toBeVisible();
        expect(refresh).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: 'Fetch schema' }));

        expect(refresh).toHaveBeenCalledTimes(1);
    });

    it('says when the schema came and offers to refresh it', () => {
        draw({
            fetchedAt: new Date().toISOString(),
            schema: buildSchema('type Query { a: Int }'),
            state: 'ready',
        });

        expect(screen.getByText(/^Schema from /)).toBeVisible();
        expect(screen.getByRole('button', { name: 'Refresh' })).toBeVisible();
    });

    it('says the way the last ask failed, in words of the app', () => {
        draw({ error: 'graphql-introspection', state: 'failed' });

        expect(screen.getByText(/did not hand over its schema/)).toBeVisible();
        expect(screen.getByRole('button', { name: 'Fetch schema' })).toBeVisible();
    });

    it('says it is fetching and cannot be pressed again meanwhile', () => {
        draw({ state: 'loading' });

        expect(screen.getByText('Fetching schema…')).toBeVisible();
        expect(screen.getByRole('button', { name: 'Fetch schema' })).toBeDisabled();
    });
});
