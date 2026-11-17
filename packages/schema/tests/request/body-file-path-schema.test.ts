import { describe, expect, it } from 'vitest';

import { bodyFilePathSchema } from '../../src/request/body-file-path-schema.js';

describe('bodyFilePathSchema', () => {
    it.each([
        ['files/a.png', true],
        ['a.png', true],
        ['files/deep/name.bin', true],
        ['/etc/passwd', false],
        ['C:/x', false],
        ['../x', false],
        ['a/../../x', false],
        ['', false],
    ])('keeps %j when %j', (path, kept) => {
        expect(bodyFilePathSchema.safeParse(path).success).toBe(kept);
    });
});
