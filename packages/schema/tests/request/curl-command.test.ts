import { describe, expect, it } from 'vitest';

import { curlCommandFrom } from '../../src/request/curl-command.js';

describe('where a pasted curl command starts', () => {
    it.each([
        ['curl https://x', 'curl https://x'],
        ['  curl.exe -X POST', 'curl.exe -X POST'],
        ['/usr/bin/curl x', '/usr/bin/curl x'],
        ['C:\\bin\\curl.exe x', 'C:\\bin\\curl.exe x'],
        ['"C:\\Program Files\\curl.exe" x', '"C:\\Program Files\\curl.exe" x'],
        ["'C:\\tools\\CURL.EXE' x", "'C:\\tools\\CURL.EXE' x"],
        ['curl', 'curl'],
        ['CURL x', 'CURL x'],
        ['$ curl x', 'curl x'],
        ['> curl x', 'curl x'],
        ['% curl x', 'curl x'],
        ['# curl x', 'curl x'],
        ['\u276f curl x', 'curl x'],
        ['sudo curl x', 'curl x'],
        ['A=1 B=2 curl x', 'curl x'],
        ['$ sudo A=1 curl x', 'curl x'],
        ['`curl x`', 'curl x`'],
        ['\ufeffcurl x', 'curl x'],
        ['# get it\nexport A=1\ncurl x', 'curl x'],
    ])('reads %j from its command', (text, command) => {
        expect(curlCommandFrom(text)).toBe(command);
    });

    it.each(['curly x', 'https://x', 'echo curl', '', 'the curl of it', 'A=1 echo curl'])(
        'finds none in %j',
        (text) => {
            expect(curlCommandFrom(text)).toBeNull();
        },
    );
});
