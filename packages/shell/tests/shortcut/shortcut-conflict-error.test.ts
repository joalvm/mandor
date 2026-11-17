import { describe, expect, it } from 'vitest';

import { ShortcutConflictError } from '../../src/shortcut/shortcut-conflict-error.js';

describe('two commands asking for the same keys', () => {
    it('names the combination and both commands', () => {
        const error = new ShortcutConflictError('$mod+KeyW', 'tab.close', 'group.close');

        expect(error.message).toBe(
            'Two commands share the shortcut $mod+KeyW: tab.close and group.close',
        );
    });

    it('is an error with a name of its own, so a log can tell it from any other', () => {
        const error = new ShortcutConflictError('a', 'one', 'other');

        expect(error).toBeInstanceOf(Error);
        expect(error.name).toBe('ShortcutConflictError');
    });
});
