import { cleanup, render } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useTabWrapper } from '../../../src/components/group-grid/useTabWrapper.js';

function Wrapped({ active }: { active: boolean }) {
    const pill = useRef<HTMLSpanElement>(null);

    useTabWrapper(pill, active);

    return (
        <div className="dv-tab" data-testid="wrapper">
            <span data-testid="pill" ref={pill} />
        </div>
    );
}

afterEach(cleanup);

describe('the wrapper dockview draws around a tab', () => {
    it('hands a menu asked for from the keys on to the pill', () => {
        const view = render(<Wrapped active={false} />);
        const heard = vi.fn();

        view.getByTestId('pill').addEventListener('contextmenu', heard);
        view.getByTestId('wrapper').dispatchEvent(
            new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
        );

        expect(heard).toHaveBeenCalledTimes(1);
    });

    it('comes into view when the tab is put in front, and only then', () => {
        const view = render(<Wrapped active={false} />);
        const scrolled = vi.spyOn(view.getByTestId('wrapper'), 'scrollIntoView');

        expect(scrolled).not.toHaveBeenCalled();
        view.rerender(<Wrapped active />);
        expect(scrolled).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    });
});
