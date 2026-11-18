import { ChevronDownIcon, Icon, type IconName } from '@mandor/icons';

import { Button, type ButtonVariant } from '../button/Button.js';
import { MenuTrigger } from './MenuTrigger.js';

type MenuButtonProps = {
    disabled?: boolean | undefined;
    disabledReason?: string | undefined;
    /** Resolves the icon color in the stylesheet, never in a prop. */
    host?: string | undefined;
    icon: IconName;
    label: string;
    /** How what the button names stands, painted by the stylesheet as a dot on the glyph. */
    tone?: 'error' | 'success' | undefined;
    variant?: ButtonVariant | undefined;
};

/**
 * The named button a menu hangs from: the glyph of what it names, the name, and the chevron.
 *
 * None of the three is a slot. The button says the same thing a line of the menu says, in the
 * same order, and a caller that could leave out the glyph would leave the chrome with buttons
 * that start at two different places. The chevron is the one mark separating a button that runs
 * a command from a button that opens a list; drawn here, no caller can forget it.
 *
 * A trigger that is not a name — a glyph alone on a row, say — is not this: that is an
 * `IconButton` inside a `MenuTrigger`, and it carries no chevron because there is no name for
 * one to follow.
 *
 * A tone is a dot on the corner of the glyph, not a colour on the name: the name stays the
 * contrast of the row, and the dot only says how what it names is doing.
 *
 * Disabled it still stands where it stood. A chrome button that came and went with what it
 * names would move every control beside it, and the row would settle in a different place each
 * time; the reason it cannot be used is said on hover instead.
 */
export function MenuButton({
    disabled,
    disabledReason,
    host,
    icon,
    label,
    tone,
    variant,
}: MenuButtonProps) {
    return (
        <MenuTrigger>
            <Button disabled={disabled} disabledReason={disabledReason} variant={variant}>
                <span
                    aria-hidden="true"
                    className="relative flex shrink-0 items-center"
                    data-host={host}
                    data-part="menu-button-glyph"
                    data-tone={tone}
                >
                    <Icon name={icon} />
                </span>
                <span className="min-w-0 truncate">{label}</span>
                <ChevronDownIcon size="sm" />
            </Button>
        </MenuTrigger>
    );
}
