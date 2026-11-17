import { editorAt } from '@mandor/ui/testing/editors-in';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MessageStrip } from '../../../../src/renderer/features/messages/components/strip/MessageStrip.js';

import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = 'mandor://local/events/message/pedido-creado';

type Section = 'description' | 'payload' | 'schema';

function draw(section: Section = 'payload') {
    const onDescriptionChange = vi.fn();
    const onGenerateSchema = vi.fn();
    const onPayloadChange = vi.fn();
    const onSchemaChange = vi.fn();
    const onSectionChange = vi.fn();
    const strip = (open: Section) => (
        <AppProviders>
            <MessageStrip
                description="Lo que avisa"
                onDescriptionChange={onDescriptionChange}
                onGenerateSchema={onGenerateSchema}
                onPayloadChange={onPayloadChange}
                onSchemaChange={onSchemaChange}
                onSectionChange={onSectionChange}
                payload='{ "id": 1 }'
                payloadLanguage="jsonc"
                resource={RESOURCE}
                schema=""
                section={open}
            />
        </AppProviders>
    );
    const { rerender } = render(strip(section));

    return {
        onDescriptionChange,
        onGenerateSchema,
        onPayloadChange,
        onSchemaChange,
        onSectionChange,
        /** The holder opens another section, as it does once the reader has asked for it. */
        openSection: (open: Section) => {
            rerender(strip(open));
        },
    };
}

describe('the strip of a message', () => {
    /** Reading what the message is for must not cost the payload that was half written. */
    /** What nobody reads is not built: the description waits until it is asked for. */
    it('draws the description the first time it is read, as a page', () => {
        const { openSection } = draw('payload');

        expect(screen.getByRole('tab', { name: 'Description' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'Message editor' })).toBeVisible();
        expect(screen.queryByText('Lo que avisa')).toBeNull();

        openSection('description');

        expect(screen.getByText('Lo que avisa')).toBeVisible();
        expect(screen.queryByRole('group', { name: 'Description editor' })).toBeNull();
    });

    it('hides the section nobody is reading instead of taking it away', () => {
        const { openSection } = draw('description');

        openSection('payload');

        expect(screen.getByText('Lo que avisa')).not.toBeVisible();
        expect(screen.getByRole('group', { name: 'Message editor' })).toBeVisible();
    });

    it('asks the holder when the reader moves to another section', () => {
        const { onSectionChange } = draw('payload');

        // The strip is Radix tabs: a section is taken with the pointer going down on it.
        fireEvent.mouseDown(screen.getByRole('tab', { name: 'Description' }));

        expect(onSectionChange).toHaveBeenCalledWith('description');
    });

    it('writes the description while it is typed', async () => {
        const { onDescriptionChange } = draw('description');

        fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
        (await editorAt(0, screen.getByRole('group', { name: 'Description editor' }))).typeOver(
            'Aviso de stock',
        );

        expect(onDescriptionChange).toHaveBeenCalledWith('Aviso de stock');
    });

    it('writes the payload through its own editor, with the templates untouched', async () => {
        const { onPayloadChange } = draw('payload');

        // The description is drawn once it is read, so the payload is the one editor.
        (await editorAt(0)).typeOver('{ "id": "{{otroId}}" }');

        expect(onPayloadChange).toHaveBeenCalledWith('{ "id": "{{otroId}}" }');
    });
});
