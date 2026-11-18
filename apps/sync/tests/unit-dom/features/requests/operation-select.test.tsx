import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OperationSelect } from '../../../../src/renderer/features/requests/components/body/OperationSelect.js';

afterEach(cleanup);

const TWO = [
    { kind: 'query', name: 'List' },
    { kind: 'mutation', name: 'Create' },
] as const;

function draw(ui: React.ReactElement): void {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{ui}</TooltipProvider>
        </MessagesProvider>,
    );
}

function open(): void {
    fireEvent.keyDown(screen.getByRole('combobox', { name: 'Operation' }), {
        code: 'ArrowDown',
        key: 'ArrowDown',
    });
}

describe('the choice of the operation of a graphql document', () => {
    it('is not there while the document has one operation or none: nothing to choose', () => {
        draw(
            <OperationSelect
                onValueChange={() => undefined}
                operations={[{ kind: 'query', name: 'List' }]}
                value={undefined}
            />,
        );

        expect(screen.queryByRole('combobox', { name: 'Operation' })).toBeNull();
    });

    it('asks for a pick while the document has several and none was chosen', () => {
        draw(
            <OperationSelect onValueChange={() => undefined} operations={TWO} value={undefined} />,
        );

        expect(screen.getByRole('combobox', { name: 'Operation' })).toHaveTextContent(
            'Pick an operation',
        );
    });

    it('hands the name of the one picked to its owner', () => {
        const onValueChange = vi.fn();

        draw(<OperationSelect onValueChange={onValueChange} operations={TWO} value="List" />);
        open();
        fireEvent.click(screen.getByRole('option', { name: 'Create' }));

        expect(onValueChange).toHaveBeenCalledWith('Create');
    });

    it('shows a subscription but does not let it be picked, and says where it lives', () => {
        const onValueChange = vi.fn();

        draw(
            <OperationSelect
                onValueChange={onValueChange}
                operations={[...TWO, { kind: 'subscription', name: 'Ticks' }]}
                value="List"
            />,
        );
        open();

        const option = screen.getByRole('option', { name: /Ticks/ });

        expect(option).toHaveAttribute('aria-disabled', 'true');
        expect(option).toHaveTextContent('Mandor Realtime');

        fireEvent.click(option);

        expect(onValueChange).not.toHaveBeenCalled();
    });
});
