import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ListRow } from '../../../src/components/row/ListRow.js';
import { RowLabel } from '../../../src/components/row/RowLabel.js';
import { RowList } from '../../../src/components/row/RowList.js';
import { useInRowList } from '../../../src/components/row/in-row-list.js';
import { useRowListFocus } from '../../../src/components/row/useRowListFocus.js';

afterEach(cleanup);

function row(name: string, selected = false) {
    return (
        <ListRow key={name} onSelect={vi.fn()} selected={selected}>
            <RowLabel>{name}</RowLabel>
        </ListRow>
    );
}

function stops(): string[] {
    return screen
        .getAllByRole('option')
        .filter((option) => option.tabIndex === 0)
        .map((option) => option.textContent);
}

function focused(): string | null | undefined {
    return document.activeElement?.textContent;
}

describe('a list of rows', () => {
    it('is one stop of the tabulator, on its first row', () => {
        render(<RowList label="Lista">{['a', 'b', 'c'].map((name) => row(name))}</RowList>);

        expect(screen.getByRole('listbox', { name: 'Lista' })).toBeVisible();
        expect(stops()).toEqual(['a']);
    });

    it('stops at the row taken, when there is one', () => {
        render(
            <RowList label="Lista">
                {row('a')}
                {row('b', true)}
            </RowList>,
        );

        expect(stops()).toEqual(['b']);
    });

    it('walks with the arrows, Home and End, without taking anything', () => {
        const onSelect = vi.fn();

        render(
            <RowList label="Lista">
                {['a', 'b', 'c'].map((name) => (
                    <ListRow key={name} onSelect={onSelect} selected={false}>
                        <RowLabel>{name}</RowLabel>
                    </ListRow>
                ))}
            </RowList>,
        );
        screen.getByRole('option', { name: 'a' }).focus();

        fireEvent.keyDown(screen.getByRole('option', { name: 'a' }), { key: 'ArrowDown' });
        expect(focused()).toBe('b');
        expect(stops()).toEqual(['b']);

        fireEvent.keyDown(screen.getByRole('option', { name: 'b' }), { key: 'End' });
        expect(focused()).toBe('c');

        fireEvent.keyDown(screen.getByRole('option', { name: 'c' }), { key: 'Home' });
        expect(focused()).toBe('a');

        fireEvent.keyDown(screen.getByRole('option', { name: 'a' }), { key: 'ArrowUp' });
        expect(focused()).toBe('a');
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('asks a long list for its ends, and lands on the row the list then draws', () => {
        const scrollTo = vi.fn();

        function Long() {
            const [names, setNames] = useState(['b', 'c']);

            return (
                <RowList
                    count={10}
                    label="Lista"
                    scrollTo={(index) => {
                        scrollTo(index);
                        setNames(['y', 'z']);
                    }}
                >
                    {names.map((name) => row(name))}
                </RowList>
            );
        }

        render(<Long />);
        screen.getByRole('option', { name: 'b' }).focus();
        fireEvent.keyDown(screen.getByRole('option', { name: 'b' }), { key: 'End' });

        expect(scrollTo).toHaveBeenCalledWith(9);
        expect(focused()).toBe('z');
    });

    it('keeps the focus in the list when the row holding it leaves the DOM', () => {
        function Scrolled() {
            const [names, setNames] = useState(['a', 'b']);

            return (
                <>
                    <button
                        onClick={() => {
                            setNames(['b']);
                        }}
                        type="button"
                    >
                        Desplazar
                    </button>
                    <RowList label="Lista">{names.map((name) => row(name))}</RowList>
                </>
            );
        }

        render(<Scrolled />);
        screen.getByRole('option', { name: 'a' }).focus();
        fireEvent.click(screen.getByRole('button', { name: 'Desplazar' }));

        expect(focused()).toBe('b');
    });

    it('stays out of the way of what a row holds', () => {
        render(
            <RowList label="Lista">
                <ListRow onSelect={vi.fn()} selected={false}>
                    <input aria-label="Nombre" />
                </ListRow>
                {row('b')}
            </RowList>,
        );
        const name = screen.getByRole('textbox', { name: 'Nombre' });

        name.focus();

        expect(fireEvent.keyDown(name, { key: 'End' })).toBe(true);
        expect(document.activeElement).toBe(name);
    });

    /** The dialog a row opens in a portal hands its keys to the list through React: not its own. */
    it('leaves the ends of a long list alone for what a row opens elsewhere', () => {
        const scrollTo = vi.fn();

        render(
            <RowList count={10} label="Lista" scrollTo={scrollTo}>
                <ListRow onSelect={vi.fn()} selected={false}>
                    <RowLabel>a</RowLabel>
                    {createPortal(<textarea aria-label="Script" />, document.body)}
                </ListRow>
            </RowList>,
        );
        const script = screen.getByRole('textbox', { name: 'Script' });

        script.focus();
        fireEvent.keyDown(script, { key: 'End' });

        expect(scrollTo).not.toHaveBeenCalled();
        expect(document.activeElement).toBe(script);
    });
});

describe('the parts of a list of rows', () => {
    it('tells a row whether a list walks it', () => {
        function Told() {
            return <span>{String(useInRowList())}</span>;
        }

        render(
            <RowList label="Lista">
                <Told />
            </RowList>,
        );
        render(<Told />);

        expect(screen.getByText('true')).toBeVisible();
        expect(screen.getByText('false')).toBeVisible();
    });

    it('asks nothing of a list that draws all its rows', () => {
        function Short() {
            const { list, onKeyDown } = useRowListFocus({});

            return (
                <div onKeyDown={onKeyDown} ref={list} role="listbox" tabIndex={0}>
                    Vacía
                </div>
            );
        }

        render(<Short />);

        expect(fireEvent.keyDown(screen.getByRole('listbox'), { key: 'End' })).toBe(true);
    });
});
