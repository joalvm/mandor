import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef, type ComponentProps, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SchemaPane, type SchemaPaneHandle } from '../../../src/components/editor/SchemaPane.js';
import { TooltipProvider } from '../../../src/components/tooltip/TooltipProvider.js';
import { editorAt } from '../../../src/testing/editors-in.js';

const LABELS = {
    editor: 'Schema editor',
    generate: 'Generate from body',
};

function paneOf(props: Partial<ComponentProps<typeof SchemaPane>> = {}): ReactNode {
    return (
        <TooltipProvider delayDuration={0}>
            <SchemaPane
                editor={{
                    key: 'schema',
                    language: 'json',
                    onValueChange: () => undefined,
                    value: '',
                }}
                labels={LABELS}
                onGenerate={() => undefined}
                options={{ wordWrap: 'on' }}
                {...props}
            />
        </TooltipProvider>
    );
}

describe('the schema pane', () => {
    it('shows its editor in the language the document speaks', async () => {
        render(paneOf());

        expect(screen.getByRole('group', { name: 'Schema editor' })).toBeVisible();
        expect((await editorAt(0)).language()).toBe('json');
    });

    it('offers the generation only while there is something to generate from', () => {
        const onGenerate = vi.fn();
        const { unmount } = render(paneOf({ onGenerate }));

        const row = screen
            .getByRole('button', { name: 'Generate from body' })
            .closest('[data-part="schema-pane-actions"]');

        expect(row).toHaveClass('h-section');

        fireEvent.click(screen.getByRole('button', { name: 'Generate from body' }));

        expect(onGenerate).toHaveBeenCalledTimes(1);

        unmount();
        render(paneOf({ onGenerate: undefined }));

        expect(screen.queryByRole('button', { name: 'Generate from body' })).toBeNull();
    });

    it('leads the strip of actions with what it holds, even with nothing to generate', () => {
        render(paneOf({ children: <span>Example: Lista</span>, onGenerate: undefined }));

        const lead = screen.getByText('Example: Lista').closest('[data-part="schema-pane-lead"]');

        expect(lead?.closest('[data-part="schema-pane-actions"]')).not.toBeNull();
    });

    it('answers to whoever mounts it for the text typed into it', async () => {
        const onValueChange = vi.fn();

        render(
            paneOf({
                editor: { key: 'schema', language: 'json', onValueChange, value: '' },
            }),
        );

        (await editorAt(0)).typeOver('{ "type": "object" }');

        expect(onValueChange).toHaveBeenLastCalledWith('{ "type": "object" }');
    });

    it('selects in its schema the rule a listed problem broke', async () => {
        const schema = '{"properties": {"name": {"type": "string"}}}';

        render(
            paneOf({
                editor: { key: 'schema', language: 'json', onValueChange: vi.fn(), value: schema },
                issues: {
                    expected: 'expected',
                    line: (line) => `Ln ${String(line)}`,
                    received: 'received',
                    resize: 'Resize',
                    rows: [
                        {
                            keyword: 'type',
                            message: 'must be string',
                            params: { expected: 'string', received: 'integer' },
                            path: '/name',
                            schemaPath: '/properties/name/type',
                        },
                    ],
                    title: '1 problem',
                },
                judged: '{"name": 7}',
            }),
        );

        const editor = await editorAt(0);
        const row = screen.getByRole('option', { name: 'must be string' });

        act(() => {
            fireEvent.click(row);
        });

        expect(screen.getByRole('region', { name: '1 problem' })).toBeVisible();
        expect(row).toHaveTextContent('Ln 1');
        expect(row.querySelector('[data-part="schema-issue-value"]')).toHaveTextContent('7');
        expect(editor.selected()).toBe('"string"');
    });

    it('writes the options of the schema into the text it holds', () => {
        const onValueChange = vi.fn();

        render(
            paneOf({
                editor: {
                    key: 'schema',
                    language: 'json',
                    onValueChange,
                    value: '{"properties": {"a": {}}}',
                },
                labels: {
                    ...LABELS,
                    settings: {
                        button: 'Schema options',
                        close: 'Close',
                        closed: 'Refuse undeclared keys',
                        closedHelp: '',
                        partly: '',
                        required: 'Every key is required',
                        requiredHelp: '',
                        title: 'Options',
                        unreadable: '',
                    },
                },
                onGenerate: undefined,
            }),
        );
        fireEvent.click(screen.getByRole('button', { name: 'Schema options' }));
        fireEvent.click(screen.getByRole('switch', { name: 'Refuse undeclared keys' }));

        expect(onValueChange).toHaveBeenCalledWith(
            expect.stringContaining('"unevaluatedProperties": false'),
        );
    });

    it('lays the document out for whoever holds the pane', async () => {
        const pane = createRef<SchemaPaneHandle>();

        render(
            <TooltipProvider delayDuration={0}>
                <SchemaPane
                    editor={{
                        key: 'payload',
                        language: 'jsonc',
                        onValueChange: () => undefined,
                        value: '{"a":1}',
                    }}
                    labels={LABELS}
                    options={{}}
                    ref={pane}
                />
            </TooltipProvider>,
        );

        const editor = await editorAt(0);

        await act(async () => {
            await pane.current?.editor?.run('format');
        });

        expect(editor.text()).toBe('{\n    "a": 1\n}');
    });
});
