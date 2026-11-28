import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChevronDownIcon } from '../src/chevron-down.js';
import { ChevronRightIcon } from '../src/chevron-right.js';
import { ICON_SIZE_PX, type IconAppearanceProps } from '../src/icon-appearance.js';
import { IconFrame } from '../src/icon-frame.js';
import { SendIcon } from '../src/send.js';

/** What every generated icon is: the frame with its paths nested inside and nothing else. */
function AddIcon(props: IconAppearanceProps) {
    return (
        <IconFrame {...props}>
            <path d="M1.5 7h13v2h-13z" />
            <path d="M7 1.5h2v13H7z" />
        </IconFrame>
    );
}

/** A hole drawn the way own sources draw one: two windings in one path, even-odd decides. */
function BucketIcon(props: IconAppearanceProps) {
    return (
        <IconFrame {...props}>
            <path d="M2.5 3h11l-1.3 10h-8.4Zm1.2 1 .9 8h6.8l.9-8Z" fillRule="evenodd" />
        </IconFrame>
    );
}

describe('the icon frame', () => {
    it('renders the nested paths hidden, sized and painted by current color', () => {
        const { container } = render(<AddIcon className="extra" />);
        const svg = container.querySelector('svg');

        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg).toHaveAttribute('class', 'extra');
        expect(svg).toHaveAttribute('data-part', 'icon');
        expect(svg).toHaveAttribute('fill', 'currentColor');
        expect(svg).toHaveAttribute('focusable', 'false');
        expect(svg).toHaveAttribute('height', '16');
        expect(svg).toHaveAttribute('viewBox', '0 0 16 16');
        expect(svg).toHaveAttribute('width', '16');
        expect(container.querySelectorAll('path')).toHaveLength(2);
        expect(svg?.getAttribute('style')).toBeNull();
    });

    it('steps through the three sizes of the scale', () => {
        expect(ICON_SIZE_PX).toEqual({ lg: 24, md: 16, sm: 14 });

        const { container } = render(<AddIcon size="sm" />);

        expect(container.querySelector('svg')).toHaveAttribute('width', '14');
        expect(container.querySelector('svg')).toHaveAttribute('height', '14');
    });

    it('keeps the color inherited unless the caller passes one', () => {
        const inherited = render(<AddIcon />);
        const passed = render(<AddIcon color="#2552aa" />);

        expect(inherited.container.querySelector('svg')?.getAttribute('color')).toBeNull();
        expect(passed.container.querySelector('svg')?.getAttribute('color')).toBe('#2552aa');
    });

    /**
     * A glyph that points along the line says so, and the stylesheet turns it round in a window
     * written from the right; one that points down, or nowhere, says nothing.
     */
    it('marks the glyphs that point along the line, and only those', () => {
        const along = [render(<ChevronRightIcon />), render(<SendIcon />)];
        const across = render(<ChevronDownIcon />);

        for (const { container } of along) {
            expect(container.querySelector('svg')).toHaveAttribute('data-mirrored', '');
        }

        expect(across.container.querySelector('svg')).not.toHaveAttribute('data-mirrored');
        expect(render(<AddIcon />).container.querySelector('svg')).not.toHaveAttribute(
            'data-mirrored',
        );
    });

    it('keeps the fill rules the source drew, whatever the origin', () => {
        const { container } = render(<BucketIcon />);
        const path = container.querySelector('path');

        expect(path).toHaveAttribute('d', 'M2.5 3h11l-1.3 10h-8.4Zm1.2 1 .9 8h6.8l.9-8Z');
        expect(path).toHaveAttribute('fill-rule', 'evenodd');
    });
});
