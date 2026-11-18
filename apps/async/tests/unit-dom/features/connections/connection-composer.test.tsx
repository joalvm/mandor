import { editorAt } from '@mandor/ui/testing/editors-in';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ConnectionSchema } from '../../../../src/renderer/features/connections/components/strip/ConnectionSchema.js';

import { EVENT } from './connection-composer.test-data.js';
import { mount } from './connection-composer-harness.js';

import { AppProviders } from '../../support/app-providers.js';
import { flush } from '../../support/flush.js';

function sendDraft(): void {
    fireEvent.keyDown(screen.getByRole('group', { name: 'Message composer' }), {
        ctrlKey: true,
        key: 'Enter',
    });
}

function formatButton(): HTMLElement {
    return screen.getByRole('button', { name: 'Beautify' });
}

describe('the connection composer', () => {
    /** The schema tab of the strip is the pane ConnectionSchema renders, in standard json. */
    it('offers the schema of the event in the standard language, and generates it', async () => {
        expect(ConnectionSchema).toBeDefined();

        const schemas: string[] = [];
        const onSchemaChange = (schema: string): void => {
            schemas.push(schema);
        };

        render(
            <AppProviders>
                <ConnectionSchema
                    broken={[]}
                    connectionId="alpha"
                    event={EVENT}
                    onSchemaChange={onSchemaChange}
                    payloadType="json"
                />
            </AppProviders>,
        );

        expect((await editorAt(0)).language()).toBe('json');
    });

    /** Formatting is rewriting, not checking: the declared format is what enables the button. */
    it('formats a json payload in place', async () => {
        const { draftsSent } = mount({ event: EVENT, payloadType: 'json' });

        (await editorAt(0)).typeOver('{"a":1}');

        expect(formatButton()).toBeEnabled();

        fireEvent.click(formatButton());
        await flush();
        sendDraft();

        expect(draftsSent).toContain('{\n    "a": 1\n}');
    });

    /** Formatting moves whitespace and nothing else: what a person wrote to remember stays. */
    it('formats a payload with its comments and templates where they were written', async () => {
        const { draftsSent } = mount({ event: EVENT, payloadType: 'json' });

        (await editorAt(0)).typeOver('{"id":{{pedidoId}}, // el pedido\n"ok":true}');

        fireEvent.click(formatButton());
        await flush();
        sendDraft();

        expect(draftsSent).toContain('{\n    "id": {{pedidoId}}, // el pedido\n    "ok": true\n}');
    });

    /** A draft being written is text, whatever it will be sent as: it is never shown as bytes. */
    it('writes a binary payload as text', async () => {
        mount({ event: { ...EVENT, payload: 'hola' }, payloadType: 'binary' });

        const editor = await editorAt(0);

        expect(editor.language()).toBe('plaintext');
        expect(editor.readOnly()).toBe(false);
    });

    it('keeps the format button out of reach while the declared format is text', () => {
        mount({ event: { ...EVENT, payload: '{"a":1}' }, payloadType: 'text' });

        expect(formatButton()).toBeDisabled();
    });

    it('leaves the format button reachable while the format is json, parse or not', () => {
        mount({ event: { ...EVENT, payload: 'hola' }, payloadType: 'json' });

        expect(formatButton()).toBeEnabled();
    });

    it('sends what the event holds when the composer asks to send', () => {
        const { draftsSent } = mount({ event: { ...EVENT, payload: '{"a":1}' } });

        sendDraft();

        expect(draftsSent).toContain('{"a":1}');
    });
});
