import type { IconAppearanceProps } from './icon-appearance.js';
import type { IconName } from './icon-name.js';
import { ICONS } from './icon-registry.js';

type IconProps = IconAppearanceProps & {
    name: IconName;
};

/**
 * Turns a name that arrives as data into its drawing in the registry. It exists only for the
 * inventoried dynamic spots: with a literal, import the concrete component. The name travels as
 * data; the component never travels through props.
 */
export function Icon({ className, color, name, size = 'md' }: IconProps) {
    const Glyph = ICONS[name];

    return <Glyph className={className} color={color} size={size} />;
}
