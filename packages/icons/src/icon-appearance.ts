import type { ComponentType, CSSProperties } from 'react';

/** The three steps of the scale, named after the tokens they map to: 14, 16 and 24 px. */
export type IconSizeName = 'sm' | 'md' | 'lg';

export const ICON_SIZE_PX = {
    lg: 24,
    md: 16,
    sm: 14,
} as const satisfies Record<IconSizeName, number>;

/** A generated icon component: appearance only, resolvable from a data name. */
export type IconComponent = ComponentType<IconAppearanceProps>;

/** What every icon component takes: appearance only, never geometry, weight or behavior. */
export type IconAppearanceProps = {
    size?: IconSizeName | undefined;
    color?: CSSProperties['color'] | undefined;
    className?: string | undefined;
};
