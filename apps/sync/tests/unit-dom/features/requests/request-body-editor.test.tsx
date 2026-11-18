import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NO_GRAPHQL_SCHEMA } from '../../support/no-graphql-schema.js';
import { RequestBodyEditor } from '../../../../src/renderer/features/requests/components/body/RequestBodyEditor.js';
import type { RequestBody } from '@mandor/schema';

afterEach(cleanup);

function tree(body: RequestBody, onChange: (body: RequestBody) => void): React.ReactElement {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <RequestBodyEditor
                    body={body}
                    environment={undefined}
                    modelKey="r1"
                    onChange={onChange}
                    onVariablesChange={() => undefined}
                    schema={NO_GRAPHQL_SCHEMA}
                />
            </TooltipProvider>
        </MessagesProvider>
    );
}

function draw(body: RequestBody, onChange: (body: RequestBody) => void = () => undefined): void {
    render(tree(body, onChange));
}

function openKinds(): void {
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Body type' }), {
        code: 'ArrowDown',
        key: 'ArrowDown',
    });
}

const EDITORS = '[data-part="request-body-editor"] [data-part="code-editor"]';

describe('the editor of the body: its RequestBodyBand, and the RequestBodyView of its kind', () => {
    it('offers the kinds of body the request keeps', () => {
        draw({ type: 'none' });

        expect(screen.getByRole('combobox', { name: 'Body type' })).toHaveTextContent('None');
        expect(screen.queryByRole('button', { name: 'Beautify' })).toBeNull();
    });

    it('lists the kinds by family: text, form and the rest', () => {
        draw({ type: 'none' });
        openKinds();

        expect(
            screen
                .getAllByRole('group')
                .map(
                    (group) =>
                        document.getElementById(group.getAttribute('aria-labelledby') ?? '')
                            ?.textContent,
                ),
        ).toEqual(['Text', 'Form', 'Other']);
    });

    it('a json body is written in the one editor of the app', async () => {
        draw({ content: '', type: 'json' });

        await waitFor(() => {
            expect(document.querySelector(EDITORS)).toBeInTheDocument();
        });
        expect(screen.getByRole('button', { name: 'Beautify' })).toBeVisible();
    });

    it('switching the kind starts the body of that kind, empty', () => {
        const onChange = vi.fn();

        draw({ type: 'none' }, onChange);
        openKinds();
        fireEvent.click(screen.getByRole('option', { name: 'Urlencoded' }));

        expect(onChange).toHaveBeenCalledWith({ fields: [], type: 'urlencoded' });
    });

    it('switching among the text kinds keeps the text the person wrote', () => {
        const onChange = vi.fn();

        draw({ content: '{ "a": 1 }', type: 'json' }, onChange);
        openKinds();
        fireEvent.click(screen.getByRole('option', { name: 'Text' }));

        expect(onChange).toHaveBeenCalledWith({ content: '{ "a": 1 }', type: 'text' });
    });

    it('an urlencoded body draws its fields as lines', () => {
        draw({ fields: [{ enabled: true, key: 'user', value: 'mandor' }], type: 'urlencoded' });

        expect(screen.getAllByRole('textbox', { name: 'Key' })[0]).toHaveTextContent('user');
    });

    it('a binary body names a file of the workspace, and refuses one that climbs out', () => {
        const onChange = vi.fn();

        draw({ file: 'files/a.png', type: 'binary' }, onChange);

        const field = screen.getByRole('textbox', { name: 'File' });

        expect(field).toHaveTextContent('files/a.png');

        fireEvent.input(field, { target: { textContent: '../etc/passwd' } });

        expect(onChange).not.toHaveBeenCalledWith({ file: '../etc/passwd', type: 'binary' });
        expect(screen.getByText(/stays inside the workspace/)).toBeVisible();
    });

    it('a path half typed gives way to the one another view wrote on disk', () => {
        const onChange = vi.fn();
        const { rerender } = render(tree({ file: 'files/a.png', type: 'binary' }, onChange));

        fireEvent.input(screen.getByRole('textbox', { name: 'File' }), {
            target: { textContent: '../a' },
        });
        rerender(tree({ file: 'files/b.png', type: 'binary' }, onChange));

        expect(screen.getByRole('textbox', { name: 'File' })).toHaveTextContent('files/b.png');
    });

    it('offers a graphql body, which starts with no query and no variables', () => {
        const onChange = vi.fn();

        draw({ type: 'none' }, onChange);
        openKinds();
        fireEvent.click(screen.getByRole('option', { name: 'GraphQL' }));

        expect(onChange).toHaveBeenCalledWith({ query: '', type: 'graphql', variables: '' });
    });

    it('a graphql body draws the query and its variables, one editor each', async () => {
        draw({ query: '{ a }', type: 'graphql', variables: '' });

        await waitFor(() => {
            expect(document.querySelectorAll(EDITORS)).toHaveLength(2);
        });
    });
});
