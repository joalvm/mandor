import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment, type Environment, type RequestBody } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { editorAt } from '@mandor/ui/testing/editors-in';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NO_GRAPHQL_SCHEMA } from '../../support/no-graphql-schema.js';
import { restOn, settled } from '../../support/undeclared-variables.js';
import { RequestBodyEditor } from '../../../../src/renderer/features/requests/components/body/RequestBodyEditor.js';

afterEach(cleanup);

const LOCAL = createEnvironment({ id: 'local', name: 'Local' });
const FILLED = createEnvironment({
    id: 'local',
    name: 'Local',
    variables: [{ enabled: true, name: 'email', secret: false, value: 'a@b.c' }],
});
const EMPTY = createEnvironment({
    id: 'local',
    name: 'Local',
    variables: [{ enabled: true, name: 'email', secret: false, value: '' }],
});

function draw(
    body: RequestBody,
    environment: Environment | undefined,
    onVariablesChange = vi.fn(),
): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <RequestBodyEditor
                    body={body}
                    environment={environment}
                    modelKey="r1"
                    onChange={() => undefined}
                    onVariablesChange={onVariablesChange}
                    schema={NO_GRAPHQL_SCHEMA}
                />
            </TooltipProvider>
        </MessagesProvider>,
    );
}

/**
 * Waits for the first editor under `root` to paint these tones. The editor is taken once, before
 * the wait: taking it acts, and an act inside a wait runs where React does not expect one.
 */
async function paints(expected: readonly string[], root: ParentNode = document): Promise<void> {
    const editor = await editorAt(0, root);

    await waitFor(() => {
        expect(editor.tones()).toEqual(expected);
    });
}

/** The pane of one editor of the body, once its editor has mounted in it. */
async function mountedPane(name: string): Promise<HTMLElement> {
    const pane = await screen.findByRole('group', { name });

    await within(pane).findByRole('textbox');

    return pane;
}

describe('the variables a body names', () => {
    it('are painted in the code editor by what the environment says of them', async () => {
        draw({ content: '{"email": "{{email}}"}', type: 'json' }, LOCAL);

        await paints(['missing']);
    });

    it.each([
        { environment: FILLED, tone: 'resolved' },
        { environment: EMPTY, tone: 'empty' },
    ])('read $tone once the environment holds them so', async ({ environment, tone }) => {
        draw({ content: '{"email": "{{email}}"}', type: 'json' }, environment);

        await paints([tone]);
    });

    it.each(['text', 'xml'] as const)('are painted in a %s body too', async (type) => {
        draw({ content: '<a>{{email}}</a>', type }, LOCAL);

        await paints(['missing']);
    });

    it('are painted in the variables of a graphql body, and not in its query', async () => {
        draw({ query: '{ a }', type: 'graphql', variables: '{"email": "{{email}}"}' }, LOCAL);

        await paints(['missing'], await mountedPane('Variables'));
        expect((await editorAt(0, await mountedPane('Query'))).tones()).toEqual([]);
    });

    it('are painted in the fields of an urlencoded body, which declare what they miss', async () => {
        const onVariablesChange = vi.fn();

        draw(
            { fields: [{ enabled: true, key: 'mail', value: '{{email}}' }], type: 'urlencoded' },
            LOCAL,
            onVariablesChange,
        );
        await settled();
        await restOn('email');
        fireEvent.click(await screen.findByRole('button', { name: 'Create it in Local' }));

        expect(onVariablesChange).toHaveBeenCalledWith([
            { enabled: true, name: 'email', secret: false, value: '' },
        ]);
    });

    it('are painted in the fields of a form body, which declare what they miss', async () => {
        const onVariablesChange = vi.fn();

        draw(
            {
                fields: [{ enabled: true, key: 'mail', kind: 'text', value: '{{email}}' }],
                type: 'form',
            },
            LOCAL,
            onVariablesChange,
        );
        await settled();
        await restOn('email');
        fireEvent.click(await screen.findByRole('button', { name: 'Create it in Local' }));

        expect(onVariablesChange).toHaveBeenCalledWith([
            { enabled: true, name: 'email', secret: false, value: '' },
        ]);
    });
});
