import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SchemaSettings } from '../../../src/components/editor/SchemaSettings.js';
import { TooltipProvider } from '../../../src/components/tooltip/TooltipProvider.js';

const LABELS = {
    button: 'Schema options',
    close: 'Close',
    closed: 'Refuse undeclared keys',
    closedHelp: 'Every object refuses a key its schema does not declare.',
    partly: 'Only some objects keep it today.',
    required: 'Every key is required',
    requiredHelp: 'Every declared key must be present.',
    title: 'Schema options',
    unreadable: 'The schema cannot be read.',
};

function open(text: string, onChange = vi.fn()): typeof onChange {
    render(
        <TooltipProvider delayDuration={0}>
            <SchemaSettings labels={LABELS} onChange={onChange} text={text} />
        </TooltipProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Schema options' }));

    return onChange;
}

describe('the options of a schema', () => {
    it('reads each option from the text of the schema', () => {
        open('{"properties": {"a": {}}, "required": ["a"]}');

        expect(screen.getByRole('dialog', { name: 'Schema options' })).toBeVisible();
        expect(screen.getByRole('switch', { name: 'Refuse undeclared keys' })).not.toBeChecked();
        expect(screen.getByRole('switch', { name: 'Every key is required' })).toBeChecked();
    });

    it('writes an option turned on into the text, for every object it describes', () => {
        const onChange = open('{"properties": {"a": {}}}');

        fireEvent.click(screen.getByRole('switch', { name: 'Refuse undeclared keys' }));

        expect(JSON.parse(String(onChange.mock.lastCall?.[0]))).toEqual({
            properties: { a: {} },
            unevaluatedProperties: false,
        });
    });

    it('takes the option out of the text when it is turned off', () => {
        const onChange = open('{"properties": {"a": {}}, "required": ["a"]}');

        fireEvent.click(screen.getByRole('switch', { name: 'Every key is required' }));

        expect(JSON.parse(String(onChange.mock.lastCall?.[0]))).toEqual({
            properties: { a: {} },
        });
    });

    it('leaves off an option only some objects keep, and says so beside it', () => {
        open('{"properties": {"a": {"properties": {"b": {}}, "required": ["b"]}}}');

        const required = screen.getByRole('switch', { name: 'Every key is required' });

        expect(required).not.toBeChecked();
        expect(required).toHaveAccessibleDescription(
            'Every declared key must be present. Only some objects keep it today.',
        );
    });

    it('shows its rules as settings, each switch at the right of its row', () => {
        open('{"properties": {"a": {}}}');

        const control = screen
            .getByRole('switch', { name: 'Refuse undeclared keys' })
            .closest('[data-part="setting-control"]');

        expect(control).toHaveClass('items-end');
    });

    it('says the schema cannot be read instead of offering options it cannot keep', () => {
        open('{"type": ');

        expect(screen.getByText('The schema cannot be read.')).toBeVisible();
        expect(screen.queryByRole('switch')).toBeNull();
    });
});
