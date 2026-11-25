import { createStore } from 'zustand/vanilla';

import type { ConsoleLevelFilter } from './console-filter.js';

/** How the person reads the console, kept on this machine apart from the settings dialog. */
export type ConsoleSettings = {
    level: ConsoleLevelFilter;
    showNetwork: boolean;
    showTimestamps: boolean;
};

const CONSOLE_SETTINGS_KEY = 'mandor.console';

const DEFAULTS: ConsoleSettings = { level: 'all', showNetwork: true, showTimestamps: false };

const LEVELS: ReadonlySet<string> = new Set(['all', 'error', 'info', 'log', 'warn']);

function isLevel(value: unknown): value is ConsoleLevelFilter {
    return typeof value === 'string' && LEVELS.has(value);
}

function flagOr(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function fieldsOf(kept: unknown): Record<string, unknown> {
    return typeof kept === 'object' && kept !== null ? { ...kept } : {};
}

/** What was kept, field by field: one missing or not what it should be takes its default. */
export function readConsoleSettings(): ConsoleSettings {
    try {
        const kept: unknown = JSON.parse(window.localStorage.getItem(CONSOLE_SETTINGS_KEY) ?? '{}');
        const { level, showNetwork, showTimestamps } = fieldsOf(kept);

        return {
            level: isLevel(level) ? level : DEFAULTS.level,
            showNetwork: flagOr(showNetwork, DEFAULTS.showNetwork),
            showTimestamps: flagOr(showTimestamps, DEFAULTS.showTimestamps),
        };
    } catch {
        return DEFAULTS;
    }
}

// store-scope: window — how the console reads is the person's, and a switch of origin keeps it.
export const consoleSettingsStore = createStore<ConsoleSettings>(() => readConsoleSettings());

/** Changes how the console reads, and keeps it for the next time the window opens. */
export function setConsoleSettings(change: Partial<ConsoleSettings>): void {
    consoleSettingsStore.setState(change);
    window.localStorage.setItem(
        CONSOLE_SETTINGS_KEY,
        JSON.stringify(consoleSettingsStore.getState()),
    );
}
