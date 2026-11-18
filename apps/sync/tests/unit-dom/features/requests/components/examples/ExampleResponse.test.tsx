import type { RequestExample } from '@mandor/schema';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExampleResponse } from '../../../../../../src/renderer/features/requests/components/examples/ExampleResponse.js';
import {
    compareExample,
    type ExampleComparison,
} from '../../../../../../src/renderer/features/requests/lib/compare/compare-example.js';
import { AppProviders } from '../../../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../../../support/http-response.js';

afterEach(cleanup);

const EXAMPLE: RequestExample = {
    body: '{"id":1}',
    contentType: 'application/json',
    cookies: [{ httpOnly: true, name: 'sid', secure: false, value: 'abc' }],
    headers: [
        ['Content-Type', 'application/json'],
        ['X-Trace', 't1'],
    ],
    name: 'Creado',
    status: '201',
};

type HarnessProps = {
    comparison?: ExampleComparison | undefined;
    example: RequestExample;
    onChange: (example: RequestExample) => void;
    schema: string | undefined;
};

/** The strip is controlled by its parent: this keeps the open section the way the panel does. */
function Harness({ comparison, example, onChange, schema }: HarnessProps) {
    const [section, setSection] = useState('body');

    return (
        <ExampleResponse
            comparison={comparison}
            entry={{ state: 'idle' }}
            example={example}
            modelKey="r1-example"
            onChange={onChange}
            onSection={setSection}
            review={{ accept: vi.fn() }}
            schema={{
                onChange: vi.fn(),
                onGenerate: vi.fn(),
                text: schema,
            }}
            section={section}
        />
    );
}

function draw(
    example: RequestExample = EXAMPLE,
    onChange: (example: RequestExample) => void = () => undefined,
    schema?: string,
): void {
    render(<Harness example={example} onChange={onChange} schema={schema} />, {
        wrapper: AppProviders,
    });
}

describe('the answer an example promises', () => {
    it('counts the cookies and the headers it carries', () => {
        draw();

        expect(screen.getByRole('tab', { name: /^Cookies/u })).toHaveTextContent('1');
        expect(screen.getByRole('tab', { name: /^Headers/u })).toHaveTextContent('2');
    });

    it('counts none for an example that carries none', () => {
        draw({ ...EXAMPLE, cookies: undefined, headers: undefined });

        expect(screen.getByRole('tab', { name: /^Headers/u })).not.toHaveTextContent('2');
    });

    it('reads the headers it carries, as a response reads them', () => {
        draw();
        fireEvent.mouseDown(screen.getByRole('tab', { name: /^Headers/u }));

        expect(screen.getByText('X-Trace')).toBeVisible();
    });

    it('ends the strip with the Differences tab, which waits for a send', () => {
        draw();

        const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);

        expect(tabs.at(-1)).toBe('Differences');

        fireEvent.mouseDown(screen.getByRole('tab', { name: /^Differences/u }));

        expect(screen.getByRole('heading', { name: 'Not checked yet' })).toBeVisible();
    });

    it('puts the Schema tab between the headers and the differences, filled once there is a schema', () => {
        draw(EXAMPLE, undefined, '{"type":"object"}');

        const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent);

        expect(tabs.map((name) => name.replace(/\d+$/u, ''))).toEqual([
            'Body',
            'Cookies',
            'Headers',
            'Schema',
            'Differences',
        ]);
        expect(
            screen
                .getByRole('tab', { name: /^Schema/u })
                .querySelector('[data-part="tabs-filled"]'),
        ).not.toBeNull();
    });

    it('opens the schema of the status, or says there is none', () => {
        draw();
        fireEvent.mouseDown(screen.getByRole('tab', { name: /^Schema/u }));

        expect(screen.getByRole('heading', { name: 'No schema for 201' })).toBeVisible();
    });

    it('offers to lay the body out when its language has a layout', () => {
        draw();

        expect(screen.getByRole('button', { name: 'Beautify' })).toBeVisible();
        expect(screen.getByRole('button', { name: 'Beautify' })).toHaveAttribute(
            'data-variant',
            'link',
        );
    });

    it('offers nothing for a body of plain text', () => {
        draw({ ...EXAMPLE, contentType: 'text/plain' });

        expect(screen.queryByRole('button', { name: 'Beautify' })).toBeNull();
    });

    it('offers nothing while the body is not what is shown', () => {
        draw();
        fireEvent.mouseDown(screen.getByRole('tab', { name: /^Headers/u }));

        expect(screen.queryByRole('button', { name: 'Beautify' })).toBeNull();
    });

    it('changes only the status when another one is picked', () => {
        const onChange = vi.fn();

        draw(EXAMPLE, onChange);
        fireEvent.keyDown(screen.getByRole('combobox', { name: 'Expected status' }), {
            code: 'ArrowDown',
            key: 'ArrowDown',
        });
        fireEvent.click(screen.getByRole('option', { name: '404 Not Found' }));

        expect(onChange).toHaveBeenCalledWith({ ...EXAMPLE, status: '404' });
    });

    it('checks the body against the schema of its status while it is written', async () => {
        draw(EXAMPLE, undefined, '{"properties": {"id": {"type": "string"}}}');

        expect((await editorAt(0)).marks()).toEqual([expect.stringMatching(/^must be string/u)]);
    });

    it('marks the Schema tab with a dot when the last answer broke a rule under it', () => {
        const schema = '{"properties": {"id": {"type": "string"}}}';
        const response = httpResponseWith({ body: textBody('{"id":2}'), status: 201 });

        render(
            <Harness
                comparison={compareExample(EXAMPLE, response, schema)}
                example={EXAMPLE}
                onChange={vi.fn()}
                schema={schema}
            />,
            { wrapper: AppProviders },
        );

        const tab = screen.getByRole('tab', { name: /^Schema/u });

        expect(tab).toHaveTextContent(/^Schema$/u);
        expect(tab.querySelector('[data-part="tabs-broken"]')).not.toBeNull();
        expect(tab.querySelector('[data-part="tabs-filled"]')).toBeNull();
    });
});
