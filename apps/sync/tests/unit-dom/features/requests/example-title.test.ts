import { describe, expect, it } from 'vitest';

import { exampleTitle } from '../../../../src/renderer/features/requests/lib/example-title.js';

describe('the title an example is chosen by', () => {
    it('says the status, the type and the name it has, and skips the ones it lacks', () => {
        expect(
            exampleTitle({
                body: '',
                contentType: 'application/json',
                name: 'Found',
                status: '200',
            }),
        ).toBe('200 · application/json · Found');
        expect(exampleTitle({ body: '', contentType: '', name: '', status: '404' })).toBe('404');
    });
});
