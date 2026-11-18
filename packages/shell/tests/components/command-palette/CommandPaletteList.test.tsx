import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import { rowName } from '@mandor/ui/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerCommand } from '../../../src/command/command-registry.js';
import { CommandPaletteList } from '../../../src/components/command-palette/CommandPaletteList.js';
import { shellStore } from '../../../src/shell-store.js';

const UNREGISTER: (() => void)[] = [];
const RAN: string[] = [];

const COMMANDS = [
    ['zeta.alpha', 'commands:splitRight'],
    ['zeta.beta', 'commands:splitDown'],
    ['zeta.gamma', 'commands:closeGroup'],
] as const;

function draw(recent: readonly string[] = []) {
    const onClose = vi.fn();
    const onRun = vi.fn();

    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <CommandPaletteList onClose={onClose} onRun={onRun} recent={recent} />
            </TooltipProvider>
        </MessagesProvider>,
    );

    return { onClose, onRun };
}

function field(): HTMLElement {
    return screen.getByRole('textbox', { name: 'Search commands' });
}

function type(value: string): void {
    field().textContent = value;
    fireEvent.input(field());
}

function names(): string[] {
    return screen.queryAllByRole('option').map(rowName);
}

beforeEach(() => {
    RAN.length = 0;

    for (const [id, title] of COMMANDS) {
        UNREGISTER.push(
            registerCommand({
                category: 'commands:categoryGroup',
                icon: 'doc',
                id,
                run: () => {
                    RAN.push(id);
                },
                title,
            }),
        );
    }
});

afterEach(() => {
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the list of the command palette', () => {
    it('lists the commands the window can run and puts the focus in the search field', () => {
        draw();

        expect(names()).toEqual(expect.arrayContaining(['Split group right', 'Split group down']));
        expect(screen.getByRole('listbox', { name: 'Command palette' })).toBeTruthy();
        expect(document.activeElement).toBe(field());
    });

    it('puts what was run last first', () => {
        draw(['zeta.beta']);

        type('group');

        expect(names().slice(0, 1)).toEqual(['Split group down']);
    });

    it('says so when nothing matches what was typed', () => {
        draw();
        type('qqqq nothing');

        expect(names()).toEqual([]);
        expect(screen.getByText('No command matches')).toBeTruthy();
    });

    it('runs the highlighted command with Enter, reporting it and closing the palette', () => {
        const { onClose, onRun } = draw();

        type('split group down');
        fireEvent.keyDown(field(), { key: 'Enter' });

        expect(RAN).toEqual(['zeta.beta']);
        expect(onRun).toHaveBeenCalledWith('zeta.beta');
        expect(onClose).toHaveBeenCalledOnce();
    });

    it('moves the highlight with the arrows and runs the row it reached', () => {
        const { onRun } = draw();

        type('split group');
        fireEvent.keyDown(field(), { key: 'ArrowDown' });
        fireEvent.keyDown(field(), { key: 'Enter' });

        expect(onRun).toHaveBeenCalledWith('zeta.beta');
    });

    it('goes back to the first row when what was typed changes', () => {
        draw();

        type('split group');
        fireEvent.keyDown(field(), { key: 'ArrowDown' });
        type('split group r');

        const selected = screen
            .getAllByRole('option')
            .filter((each) => each.ariaSelected === 'true');

        expect(selected.map(rowName)).toEqual(['Split group right']);
    });

    it('closes without running anything on Escape', () => {
        const { onClose, onRun } = draw();

        fireEvent.keyDown(field(), { key: 'Escape' });

        expect(onClose).toHaveBeenCalledOnce();
        expect(onRun).not.toHaveBeenCalled();
    });

    it('does nothing on Enter while no command matches', () => {
        const { onClose, onRun } = draw();

        type('qqqq nothing');
        fireEvent.keyDown(field(), { key: 'Enter' });

        expect(onRun).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(shellStore.getState().grid.kind).toBe('leaf');
    });
});
