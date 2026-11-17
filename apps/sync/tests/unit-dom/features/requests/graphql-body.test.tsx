import { MessagesProvider } from '@mandor/i18n';
import type { RequestBody } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NO_GRAPHQL_SCHEMA } from '../../support/no-graphql-schema.js';
import { GraphqlBody } from '../../../../src/renderer/features/requests/components/body/GraphqlBody.js';

afterEach(cleanup);

type Graphql = Extract<RequestBody, { type: 'graphql' }>;

const TWO = 'query A { a } query B { b }';

function draw(body: Graphql, onChange = vi.fn()): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <GraphqlBody
                    body={body}
                    modelKey="r1"
                    onChange={onChange}
                    schema={NO_GRAPHQL_SCHEMA}
                    variables={{ variablesOf: () => [] }}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

describe('the editor of a graphql body', () => {
    it('writes the query and its variables in two editors of the app, split in two', async () => {
        draw({ query: '{ a }', type: 'graphql', variables: '' });

        await waitFor(() => {
            expect(document.querySelectorAll('[data-part="code-editor"]')).toHaveLength(2);
        });
        expect(screen.getByRole('separator')).toBeVisible();
    });

    it('offers the operations only when the document has more than one', () => {
        draw({ query: TWO, type: 'graphql', variables: '' });

        expect(screen.getByRole('combobox', { name: 'Operation' })).toBeVisible();
    });

    it('has no operation to choose for a document with one', () => {
        draw({ query: 'query A { a }', type: 'graphql', variables: '' });

        expect(screen.queryByRole('combobox', { name: 'Operation' })).toBeNull();
    });

    it('says the syntax error under the choice and keeps the editors alive', async () => {
        draw({ query: 'query {', type: 'graphql', variables: '' });

        expect(screen.getByText(/Syntax Error/)).toBeVisible();
        await waitFor(() => {
            expect(document.querySelectorAll('[data-part="code-editor"]')).toHaveLength(2);
        });
    });

    it('says nothing about syntax while there is no query yet', () => {
        draw({ query: '', type: 'graphql', variables: '' });

        expect(screen.queryByText(/Syntax Error/)).toBeNull();
    });

    it('keeps the operation picked with the document it was picked from', () => {
        const onChange = vi.fn();

        draw({ operationName: 'A', query: TWO, type: 'graphql', variables: '' }, onChange);
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Operation' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });
        fireEvent.click(screen.getByRole('option', { name: 'B' }));

        expect(onChange).toHaveBeenCalledWith({
            operationName: 'B',
            query: TWO,
            type: 'graphql',
            variables: '',
        });
    });
});
