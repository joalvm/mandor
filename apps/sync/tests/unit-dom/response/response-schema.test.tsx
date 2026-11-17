import { editorAt } from '@mandor/ui/testing/editors-in';
import { validateValue, compileSchema, type SchemaIssue } from '@mandor/validate';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResponseSchema } from '../../../src/renderer/response/ResponseSchema.js';
import { AppProviders } from '../support/app-providers.js';

afterEach(cleanup);

const SCHEMA = '{"type": "object", "properties": {"id": {"type": "string"}}}';

function brokenBy(value: unknown): SchemaIssue[] {
    const compiled = compileSchema(SCHEMA);

    return compiled.ok ? validateValue(compiled.schema, value) : [];
}

function draw(props: Partial<ComponentProps<typeof ResponseSchema>> = {}) {
    const handlers = { onChange: vi.fn(), onChoose: vi.fn(), onGenerate: vi.fn() };

    render(
        <ResponseSchema
            chosen="lista"
            examples={[
                { key: 'lista', name: 'Lista' },
                { key: 'paginado', name: 'Paginado' },
            ]}
            issues={[]}
            judged="{}"
            modelKey="r1#schema"
            status={200}
            text={SCHEMA}
            {...handlers}
            {...props}
        />,
        { wrapper: AppProviders },
    );

    return handlers;
}

describe('the schema an answer answers to (ResponseSchema)', () => {
    it('selects in the schema the rule a listed problem broke', async () => {
        draw({ issues: brokenBy({ id: 1 }), judged: '{"id": 1}' });

        const editor = await editorAt(0);

        expect(screen.getByRole('region', { name: 'Received 200 · 1 problem' })).toBeVisible();

        act(() => {
            fireEvent.click(screen.getByRole('option', { name: /^must be string/u }));
        });

        expect(editor.selected()).toBe('"string"');
        expect(screen.getByRole('option', { name: /^must be string/u })).toHaveTextContent(
            /^\$\.idtypeLn 1must be string.*expectedstringreceivedinteger1$/u,
        );
    });

    it('lists nothing under an answer that keeps every rule', () => {
        draw();

        expect(screen.queryByRole('region', { name: /^Received/u })).toBeNull();
    });

    it('is written where it is read, and written again from the response', async () => {
        const { onChange, onGenerate } = draw();
        const editor = await editorAt(0);

        expect(editor.readOnly()).toBe(false);

        editor.typeOver('{"type": "array"}');

        expect(onChange).toHaveBeenLastCalledWith('{"type": "array"}');

        fireEvent.click(screen.getByRole('button', { name: 'Generate from the response' }));

        expect(onGenerate).toHaveBeenCalledOnce();
    });

    it('names the example it belongs to, and offers the others of the status', async () => {
        const { onChoose } = draw();
        const choice = screen.getByRole('combobox', { name: 'Example of the schema' });

        expect(choice).toHaveTextContent('Lista');

        fireEvent.keyDown(choice, { key: 'ArrowDown' });
        fireEvent.click(await screen.findByRole('option', { name: 'Paginado' }));

        expect(onChoose).toHaveBeenCalledWith('paginado');
    });
});
