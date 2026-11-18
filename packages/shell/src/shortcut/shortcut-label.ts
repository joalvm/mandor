const APPLE_MODIFIERS: Record<string, string> = {
    $mod: '\u2318',
    Alt: '\u2325',
    Control: '\u2303',
    Shift: '\u21e7',
};

const MODIFIERS: Record<string, string> = {
    $mod: 'Ctrl',
    Alt: 'Alt',
    Control: 'Ctrl',
    Shift: 'Shift',
};

const KEYS: Record<string, string> = {
    ArrowDown: '\u2193',
    ArrowLeft: '\u2190',
    ArrowRight: '\u2192',
    ArrowUp: '\u2191',
    PageDown: 'PgDn',
    PageUp: 'PgUp',
    Backslash: '\\',
};

const CODE_PREFIX = /^(?:Key|Digit)/u;

function partLabel(part: string, apple: boolean): string {
    const modifier = (apple ? APPLE_MODIFIERS : MODIFIERS)[part];

    if (modifier !== undefined) {
        return modifier;
    }

    return KEYS[part] ?? part.replace(CODE_PREFIX, '');
}

function pressLabel(press: string, apple: boolean): string {
    const parts = press.split('+').map((part) => partLabel(part, apple));

    return parts.join(apple ? '' : '+');
}

/**
 * The shortcut as it is read on this platform: `Ctrl+Shift+W` where there are words for the
 * modifiers, and the run-together symbols where the keys wear them printed on. A chord is several
 * presses one after another, written apart by a space: `Ctrl+K Enter`.
 */
export function shortcutLabel(combination: string, apple: boolean): string {
    return combination
        .split(' ')
        .map((press) => pressLabel(press, apple))
        .join(' ');
}
