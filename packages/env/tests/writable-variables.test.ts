import { describe, expect, it } from 'vitest';

import { blocksTheWrite, writableVariables } from '../src/lib/writable-variables.js';

const HOST = { enabled: true, name: 'host', secret: false, value: 'api.test' };

describe('the variables a list can be written with', () => {
    it('lets a wholly empty row pass and leaves it out of the file', () => {
        const empty = { ...HOST, name: '', value: '' };

        expect(blocksTheWrite(empty)).toBe(false);
        expect(writableVariables([HOST, empty])).toEqual([HOST]);
    });

    it('stops the list while a row says something under a name nothing would match', () => {
        expect(blocksTheWrite({ name: '', value: 'api.test' })).toBe(true);
        expect(blocksTheWrite({ name: 'two words', value: '' })).toBe(true);
        expect(writableVariables([HOST, { ...HOST, name: '{{host}}' }])).toBeNull();
    });

    it('writes a list of good names as it is', () => {
        expect(writableVariables([HOST])).toEqual([HOST]);
    });
});
