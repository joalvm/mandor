import { describe, expect, it } from 'vitest';

import { pastedCommand } from '../../src/curl/pasted-command.js';

describe('the command inside what was copied', () => {
    it.each([
        ['a fence with its language', '```bash\ncurl x\n```', 'curl x\n'],
        ['a fence with a Windows line end', '```\r\ncurl x\r\n```', 'curl x\r\n'],
        ['an inline code mark', '`curl x`', 'curl x'],
        ['what comes before', '# get\n$ curl x', 'curl x'],
        ['a Windows path', 'C:\\bin\\curl.exe x', 'curl.exe x'],
        ['a quoted path with spaces', '"C:\\Program Files\\curl.exe" x', 'curl.exe x'],
        ['a path of its own', '/usr/bin/curl x', 'curl x'],
    ])('takes it out of %s', (_name, text, command) => {
        expect(pastedCommand(text)).toBe(command);
    });

    it('keeps a body that has a fence in it', () => {
        const text = "curl x -d '```a```'";

        expect(pastedCommand(text)).toBe(text);
    });

    it('leaves as it came a text that runs no curl', () => {
        expect(pastedCommand('wget x')).toBe('wget x');
    });
});
