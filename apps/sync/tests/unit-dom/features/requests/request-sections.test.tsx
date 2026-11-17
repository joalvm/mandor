import { itemResource } from '@mandor/collections';
import { parseCollectionItem, parseRequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestSections } from '../../../../src/renderer/features/requests/components/panel/RequestSections.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const REQUEST = parseRequestItem(
    parseCollectionItem({
        kind: 'request',
        method: 'GET',
        name: 'crear pedido',
        query: [{ key: 'dryRun', value: 'true', enabled: true }],
        url: 'http://localhost/pedidos',
    }),
);

function draw(onChange = vi.fn()): void {
    render(
        <RequestSections
            environment={undefined}
            onChange={onChange}
            onVariablesChange={() => undefined}
            request={REQUEST}
            resource={RESOURCE}
        />,
        { wrapper: AppProviders },
    );
}

describe('the sections of a request', () => {
    beforeEach(() => {
        shellStore.getState().reset();
    });

    afterEach(() => {
        cleanup();
        shellStore.getState().reset();
    });

    it('opens on the query, with every other half of the request one tab away', () => {
        draw();

        expect(screen.getByRole('tab', { name: /^Params/u, selected: true })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Headers' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Body' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Settings' })).toBeVisible();
        expect(screen.getByRole('tab', { name: 'Doc' })).toBeVisible();
    });

    it('remembers the section under the resource, not under the tab strip', () => {
        draw();

        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Settings' }));
        fireEvent.focus(screen.getByRole('tab', { name: 'Settings' }));

        expect(screen.getByRole('tab', { name: 'Settings', selected: true })).toBeVisible();
    });

    it('hands what was edited to its owner as the changes of the request', () => {
        const onChange = vi.fn();

        draw(onChange);
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Settings' }));
        fireEvent.input(screen.getByRole('textbox', { name: 'Timeout' }), {
            target: { textContent: '5000' },
        });

        expect(onChange).toHaveBeenCalledWith({
            settings: expect.objectContaining({ timeoutMs: 5000 }) as unknown,
        });
    });

    it('moves a GET to POST when the body becomes graphql, because a GET carries no body', () => {
        const onChange = vi.fn();

        draw(onChange);
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Body' }));
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Body type' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });
        fireEvent.click(screen.getByRole('option', { name: 'GraphQL' }));

        expect(onChange).toHaveBeenCalledWith({
            body: { query: '', type: 'graphql', variables: '' },
            method: 'POST',
        });
    });

    it('leaves the method alone when a body of any other kind is picked', () => {
        const onChange = vi.fn();

        draw(onChange);
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Body' }));
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Body type' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });
        fireEvent.click(screen.getByRole('option', { name: 'JSON' }));

        expect(onChange).toHaveBeenCalledWith({ body: { content: '', type: 'json' } });
    });

    it('shows the path a document brought, and only then, and never its examples', () => {
        const brought = parseRequestItem(
            parseCollectionItem({
                examples: [
                    { body: '{}', contentType: 'application/json', name: '', status: '200' },
                ],
                kind: 'request',
                method: 'GET',
                name: 'pet',
                pathParams: [{ enabled: true, key: 'petId', required: true, value: '' }],
                url: 'http://localhost/pets/{petId}',
            }),
        );

        draw();

        expect(screen.queryByRole('tab', { name: 'Path' })).toBeNull();
        expect(screen.queryByRole('tab', { name: 'Examples' })).toBeNull();

        cleanup();
        render(
            <RequestSections
                environment={undefined}
                onChange={vi.fn()}
                onVariablesChange={() => undefined}
                request={brought}
                resource={RESOURCE}
            />,
            { wrapper: AppProviders },
        );

        expect(screen.getByRole('tab', { name: 'Path' })).toBeVisible();
        expect(screen.queryByRole('tab', { name: /^Examples/u })).toBeNull();
    });

    it('keeps the contract of a path row while its value is edited', () => {
        const onChange = vi.fn();
        const brought = parseRequestItem(
            parseCollectionItem({
                kind: 'request',
                method: 'GET',
                name: 'pet',
                pathParams: [{ enabled: true, key: 'petId', required: true, value: '' }],
                url: 'http://localhost/pets/{petId}',
            }),
        );

        render(
            <RequestSections
                environment={undefined}
                onChange={onChange}
                onVariablesChange={() => undefined}
                request={brought}
                resource={RESOURCE}
            />,
            { wrapper: AppProviders },
        );
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Path' }));
        // The path table also draws the empty row last; the row of `petId` is the first.
        const [value] = screen.getAllByRole('textbox', { name: 'Value' });

        if (value === undefined) {
            throw new Error('no value cell');
        }

        fireEvent.input(value, { target: { textContent: '7' } });

        expect(onChange).toHaveBeenCalledWith({
            pathParams: [{ enabled: true, key: 'petId', required: true, value: '7' }],
        });
    });
});
