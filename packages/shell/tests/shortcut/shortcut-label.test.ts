import { describe, expect, it } from 'vitest';

import { shortcutLabel } from '../../src/index.js';

describe('the written form of a shortcut', () => {
    it('spells the modifiers the way the platform reading it does', () => {
        expect(shortcutLabel('$mod+Shift+KeyW', false)).toBe('Ctrl+Shift+W');
        expect(shortcutLabel('$mod+Shift+KeyW', true)).toBe('⌘⇧W');
    });

    it('drops the prefix a key code carries and draws the arrows', () => {
        expect(shortcutLabel('$mod+Digit1', false)).toBe('Ctrl+1');
        expect(shortcutLabel('$mod+Alt+ArrowRight', false)).toBe('Ctrl+Alt+→');
        expect(shortcutLabel('$mod+Backslash', false)).toBe('Ctrl+\\');
    });

    it('writes each press of a chord apart, in the order they are made', () => {
        expect(shortcutLabel('$mod+KeyK Enter', false)).toBe('Ctrl+K Enter');
        expect(shortcutLabel('$mod+KeyK Enter', true)).toBe('⌘K Enter');
    });
});
