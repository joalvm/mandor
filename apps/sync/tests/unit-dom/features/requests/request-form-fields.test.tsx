import { MessagesProvider } from '@mandor/i18n';
import type { RequestFormField } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RequestFormFields } from '../../../../src/renderer/features/requests/components/body/RequestFormFields.js';

afterEach(cleanup);

const FIELDS: RequestFormField[] = [
    { enabled: true, key: 'cv', kind: 'file', value: 'files/a.png' },
];

function nth(elements: readonly HTMLElement[], index: number): HTMLElement {
    const element = elements[index];

    if (element === undefined) {
        throw new Error(`nothing at ${String(index)}`);
    }

    return element;
}

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

describe('the fields of a form body', () => {
    it('draws each field with its kind of value beside the line', () => {
        draw(
            <RequestFormFields
                environment={undefined}
                fields={FIELDS}
                onChange={() => undefined}
                onVariablesChange={() => undefined}
            />,
        );

        expect(screen.getByRole('combobox', { name: 'Kind' })).toHaveTextContent('File');
        expect(screen.getByRole('textbox', { name: 'Name' })).toHaveTextContent('cv');
    });

    it('the new line joins the request half typed, and keeps the kind of those before', () => {
        const onChange = vi.fn();

        draw(
            <RequestFormFields
                environment={undefined}
                fields={FIELDS}
                onChange={onChange}
                onVariablesChange={() => undefined}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));

        expect(onChange).toHaveBeenCalledWith([
            ...FIELDS,
            { enabled: true, key: '', kind: 'text', value: '' },
        ]);
    });

    it('an edit keeps what a document said of each field, which the editor does not draw', () => {
        const onChange = vi.fn();
        const documented: RequestFormField = {
            description: 'The picture of the profile',
            enabled: true,
            key: 'avatar',
            kind: 'file',
            meta: { type: 'string' },
            required: true,
            schema: '{"type":"string","format":"binary"}',
            value: '',
        };

        draw(
            <RequestFormFields
                environment={undefined}
                fields={[documented, ...FIELDS]}
                onChange={onChange}
                onVariablesChange={() => undefined}
            />,
        );

        fireEvent.click(nth(screen.getAllByRole('button', { name: 'Remove entry' }), 1));

        expect(onChange).toHaveBeenCalledWith([documented]);
    });
});
