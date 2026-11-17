import { editorAt } from '@mandor/ui/testing/editors-in';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExampleSchema } from '../../../../../../src/renderer/features/requests/components/examples/ExampleSchema.js';
import { compareExample } from '../../../../../../src/renderer/features/requests/lib/compare/compare-example.js';
import { AppProviders } from '../../../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../../../support/http-response.js';

afterEach(cleanup);

const SCHEMA = '{"type": "object", "properties": {"id": {"type": "string"}}}';

/** The answer `{"id": 2}` came with a 401 and was set against the schema given. */
function answeredAgainst(schema: string) {
    const example = {
        body: '{"id":"a"}',
        contentType: 'application/json',
        name: 'x',
        status: '401',
    };

    return compareExample(
        example,
        httpResponseWith({ body: textBody('{"id":2}'), status: 401 }),
        schema,
    );
}

type Props = Partial<Parameters<typeof ExampleSchema>[0]>;

function draw(props: Props = {}) {
    const onChange = vi.fn();
    const onGenerate = vi.fn();

    render(
        <ExampleSchema
            modelKey="mandor://x#1"
            onChange={onChange}
            onGenerate={onGenerate}
            status="401"
            text={undefined}
            {...props}
        />,
        { wrapper: AppProviders },
    );

    return { onChange, onGenerate };
}

describe('the Schema tab of an example (ExampleSchema)', () => {
    it('says there is no schema for the status and offers to write it from the body', () => {
        const { onGenerate } = draw();

        expect(screen.getByRole('heading', { name: 'No schema for 401' })).toBeVisible();
        expect(screen.getByText(/^It is generated from the expected body/u)).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Generate from the body' }));

        expect(onGenerate).toHaveBeenCalledOnce();
    });

    it('names whose schema it is and offers to write it again', () => {
        const { onGenerate } = draw({ text: '{"type":"object"}' });

        expect(screen.getByText('Response 401 of this example')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Regenerate from the body' }));

        expect(onGenerate).toHaveBeenCalledOnce();
    });

    it('tells why the text cannot be read, and keeps the editor', () => {
        draw({ error: 'Unexpected end of JSON', text: '{"type":' });

        expect(screen.getByText('Unexpected end of JSON')).toBeVisible();
        expect(screen.getByText('Response 401 of this example')).toBeVisible();
    });

    it('lists under the text the rules the last answer broke, and selects the one taken', async () => {
        draw({ comparison: answeredAgainst(SCHEMA), text: SCHEMA });

        const editor = await editorAt(0);

        expect(screen.getByRole('region', { name: 'Received 401 · 1 problem' })).toBeVisible();

        act(() => {
            fireEvent.click(screen.getByRole('option', { name: /^must be string/u }));
        });

        expect(editor.selected()).toBe('"string"');
    });

    it('lists nothing when the answer was set against the schema of another status', () => {
        draw({ comparison: answeredAgainst('{"type": "array"}'), text: SCHEMA });

        expect(screen.queryByRole('region', { name: /^Received/u })).toBeNull();
    });

    it('writes the options of the schema into its text', () => {
        const { onChange } = draw({ text: '{"properties": {"id": {}}}' });

        fireEvent.click(screen.getByRole('button', { name: 'Schema options' }));
        fireEvent.click(screen.getByRole('switch', { name: 'Refuse undeclared properties' }));

        expect(onChange).toHaveBeenCalledWith(
            expect.stringContaining('"unevaluatedProperties": false'),
        );
    });
});
