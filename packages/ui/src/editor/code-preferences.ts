import { CODE_FONT_SIZE } from './code-font-size.js';
import { CODE_INDENT } from './code-indent.js';

/** How every code editor of the window writes, as the person set it in the settings of the app. */
export type CodePreferences = {
    /** Typing an opening bracket or quote writes the closing one after it. */
    autoClose: boolean;
    /** A family of the system to write in, as a list of fonts; empty writes in the product's. */
    fontFamily: string;
    /** The size of the text, in pixels, before the reader's zoom of the window. */
    fontSize: number;
    /** How many columns one level of code steps in by, typed or laid out by a button. */
    indentSize: number;
    /** Steps in with a tab rather than with spaces. */
    indentWithTabs: boolean;
    /** A line longer than the editor goes on under itself, where the editor lets lines wrap. */
    wordWrap: boolean;
};

/** What the editors write with until the settings say otherwise. */
export const DEFAULT_CODE_PREFERENCES: CodePreferences = {
    autoClose: true,
    fontFamily: '',
    fontSize: CODE_FONT_SIZE,
    indentSize: CODE_INDENT,
    indentWithTabs: false,
    wordWrap: true,
};

const state = { current: DEFAULT_CODE_PREFERENCES };

const listeners = new Set<() => void>();

function sameAs(next: CodePreferences): boolean {
    const keys = Object.keys(next) as (keyof CodePreferences)[];

    return keys.every((key) => next[key] === state.current[key]);
}

/** How the editors write now. */
export function codePreferences(): CodePreferences {
    return state.current;
}

/** Writes every editor of the window the way the settings say, the open ones included. */
export function setCodePreferences(next: CodePreferences): void {
    if (sameAs(next)) {
        return;
    }

    state.current = next;
    listeners.forEach((listener) => {
        listener();
    });
}

/** Tells each change of how the editors write, and hands back the way to stop listening. */
export function watchCodePreferences(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}
