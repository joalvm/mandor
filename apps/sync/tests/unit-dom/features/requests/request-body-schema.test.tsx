import { itemResource } from '@mandor/collections';
import { createRequestItem, type RequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestBodySchema } from '../../../../src/renderer/features/requests/components/body/RequestBodySchema.js';
import { RequestSections } from '../../../../src/renderer/features/requests/components/panel/RequestSections.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');

const SCHEMA = '{"type":"object","properties":{"id":{"type":"integer"}}}';

function json(content: string, bodySchema?: string): RequestItem {
    return {
        ...createRequestItem({ name: 'pedido' }),
        body: { content, type: 'json' },
        bodySchema,
    };
}

function draw(request: RequestItem, onChange = vi.fn()): void {
    render(
        <RequestSections
            environment={undefined}
            onChange={onChange}
            onVariablesChange={() => undefined}
            request={request}
            resource={RESOURCE}
        />,
        { wrapper: AppProviders },
    );
}

describe('the schema of the body of a request', () => {
    beforeEach(() => {
        shellStore.getState().reset();
    });

    afterEach(() => {
        cleanup();
        shellStore.getState().reset();
    });

    it('writes the schema the json body tells from its own tab', async () => {
        const onChange = vi.fn();

        draw(json('{"id": 1}'), onChange);
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Schema' }));

        expect(await screen.findByRole('group', { name: 'Schema of the body' })).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Generate from the body' }));

        expect(onChange).toHaveBeenCalledWith({
            bodySchema: expect.stringContaining('"id"') as unknown,
        });
    });

    it('writes the body the schema asks for from the band of the body', () => {
        const onChange = vi.fn();

        draw(json('', SCHEMA), onChange);
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Body' }));
        fireEvent.click(screen.getByRole('button', { name: 'Generate from the schema' }));

        expect(onChange).toHaveBeenCalledWith({
            body: { content: expect.stringContaining('"id"') as unknown, type: 'json' },
        });
    });

    it('offers no body to generate while no schema is written', () => {
        draw(json('{"id": 1}'));
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Body' }));

        expect(screen.queryByRole('button', { name: 'Generate from the schema' })).toBeNull();
    });

    it('offers no generation in the pane when there is nothing to generate from', async () => {
        render(
            <RequestBodySchema
                body={{ content: 'hola', type: 'text' }}
                broken={[]}
                onGenerate={undefined}
                onSchemaChange={() => undefined}
                resource={RESOURCE}
                schema={SCHEMA}
            />,
            { wrapper: AppProviders },
        );

        expect(await screen.findByRole('group', { name: 'Schema of the body' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Generate from the body' })).toBeNull();
    });
});
