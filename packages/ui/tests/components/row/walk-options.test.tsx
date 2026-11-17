import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { walkOptions } from '../../../src/components/row/walk-options.js';

function draw() {
    render(
        <div onKeyDown={walkOptions} role="listbox" tabIndex={-1}>
            {['General', 'Network', 'Proxy'].map((name) => (
                <button key={name} role="option" type="button">
                    {name}
                </button>
            ))}
        </div>,
    );

    return (name: string) => screen.getByRole('option', { name });
}

afterEach(cleanup);

describe('walking the sections of a dialog', () => {
    it('moves the focus with the arrows and stops at either end', () => {
        const section = draw();

        fireEvent.keyDown(section('General'), { key: 'ArrowUp' });

        expect(section('General')).toHaveFocus();

        fireEvent.keyDown(section('General'), { key: 'ArrowDown' });

        expect(section('Network')).toHaveFocus();
    });

    it('jumps to the last and the first with End and Home', () => {
        const section = draw();

        fireEvent.keyDown(section('General'), { key: 'End' });

        expect(section('Proxy')).toHaveFocus();

        fireEvent.keyDown(section('Proxy'), { key: 'Home' });

        expect(section('General')).toHaveFocus();
    });

    it('leaves any other key, and a key outside the sections, alone', () => {
        const section = draw();

        fireEvent.keyDown(section('General'), { key: 'Enter' });
        fireEvent.keyDown(screen.getByRole('listbox'), { key: 'ArrowDown' });

        expect(document.body).toHaveFocus();
    });
});
