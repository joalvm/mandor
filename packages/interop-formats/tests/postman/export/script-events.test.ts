import { describe, expect, it } from 'vitest';

import { scriptEventsOf } from '../../../src/postman/export/script-events.js';

describe('scriptEventsOf', () => {
    it('writes nothing when no script was left', () => {
        expect(scriptEventsOf(undefined)).toEqual([]);
    });

    it('writes the scripts of Postman line by line and leaves out those of another tool', () => {
        expect(
            scriptEventsOf([
                { event: 'onBeforeRequest', dialect: 'postman', source: 'a();\nb();' },
                { event: 'onResponse', dialect: 'postman', source: 'c();' },
                { event: 'onResponse', dialect: 'insomnia', source: 'insomnia.test();' },
            ]),
        ).toEqual([
            {
                listen: 'prerequest',
                script: { type: 'text/javascript', exec: ['a();', 'b();'] },
            },
            { listen: 'test', script: { type: 'text/javascript', exec: ['c();'] } },
        ]);
    });
});
