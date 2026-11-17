import type { PropsWithChildren } from 'react';

import { type IconAppearanceProps, ICON_SIZE_PX } from './icon-appearance.js';

type IconFrameProps = PropsWithChildren<IconAppearanceProps>;

/** The SVG shell every icon renders inside: hidden from assistive tech, painted by currentColor. */
export function IconFrame({ children, className, color, size = 'md' }: IconFrameProps) {
    const pixels = ICON_SIZE_PX[size];

    return (
        <svg
            aria-hidden="true"
            className={className}
            color={color}
            data-part="icon"
            fill="currentColor"
            focusable="false"
            height={pixels}
            viewBox="0 0 16 16"
            width={pixels}
            xmlns="http://www.w3.org/2000/svg"
        >
            {children}
        </svg>
    );
}
