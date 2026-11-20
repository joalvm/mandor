import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useFocusReturn } from '../../src/hooks/useFocusReturn.js';

afterEach(() => {
    cleanup();
});

function Popup() {
    useFocusReturn('popup-field');

    return <input aria-label="Field" id="popup-field" />;
}

/** Drawn all along, and only holding the focus while it says it is active. */
function Lasting({ active }: { active: boolean }) {
    useFocusReturn('lasting-field', active);

    return <input aria-label="Lasting" id="lasting-field" />;
}

function Harness({ withField = true }: { withField?: boolean }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => {
                    setOpen(!open);
                }}
                type="button"
            >
                Toggle
            </button>
            {open && withField ? <Popup /> : null}
        </>
    );
}

describe('moving the focus while something is drawn', () => {
    it('puts the focus on the element while it is drawn and hands it back when it goes', () => {
        render(<Harness />);

        const origin = screen.getByRole('button', { name: 'Toggle' });

        origin.focus();
        fireEvent.click(origin);

        expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Field' }));

        fireEvent.click(origin);

        expect(document.activeElement).toBe(origin);
    });

    it('hands the focus back the moment it stops being active, while still drawn', () => {
        const { rerender } = render(
            <>
                <button type="button">Origin</button>
                <Lasting active={false} />
            </>,
        );
        const origin = screen.getByRole('button', { name: 'Origin' });

        origin.focus();
        rerender(
            <>
                <button type="button">Origin</button>
                <Lasting active />
            </>,
        );

        expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Lasting' }));

        rerender(
            <>
                <button type="button">Origin</button>
                <Lasting active={false} />
            </>,
        );

        expect(document.activeElement).toBe(origin);
        expect(screen.getByRole('textbox', { name: 'Lasting' })).toBeInTheDocument();
    });

    it('leaves the focus where it was when the element it names is not there', () => {
        render(<Harness withField={false} />);

        const origin = screen.getByRole('button', { name: 'Toggle' });

        origin.focus();
        fireEvent.click(origin);

        expect(document.activeElement).toBe(origin);
    });
});
