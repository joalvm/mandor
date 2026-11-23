import { describe, expect, it } from 'vitest';

import { scriptEventsOf } from '../../../src/postman/export/script-events.js';

describe('scriptEventsOf', () => {
    it('writes nothing when there is no script, or only blank ones', () => {
        expect(scriptEventsOf(undefined)).toEqual([]);
        expect(scriptEventsOf({ onResponse: { source: ' ' } })).toEqual([]);
    });

    it('writes each script line by line in its event', () => {
        expect(
            scriptEventsOf({
                onBeforeRequest: { source: 'a();\nb();' },
                onResponse: { source: 'c();' },
            }),
        ).toEqual([
            {
                listen: 'prerequest',
                script: { type: 'text/javascript', exec: ['a();', 'b();'] },
            },
            { listen: 'test', script: { type: 'text/javascript', exec: ['c();'] } },
        ]);
    });

    it('keeps a script that is off, switched off as Postman keeps it', () => {
        expect(scriptEventsOf({ onResponse: { source: 'c();', enabled: false } })).toEqual([
            {
                listen: 'test',
                script: { type: 'text/javascript', exec: ['c();'] },
                disabled: true,
            },
        ]);
    });
});
