import { itemResource } from '@mandor/collections';
import { describe, expect, it, vi } from 'vitest';

import { bodyFileOf } from '../../../../src/renderer/features/requests/lib/body-file.js';
import {
    keepResponse,
    keepWhenDone,
} from '../../../../src/renderer/features/requests/lib/keep-when-done.js';
import { looseResource } from '../../../../src/renderer/features/requests/lib/loose-resource.js';
import {
    snippetFailure,
    snippetLeftOutFile,
} from '../../../../src/renderer/features/requests/lib/snippet-state.js';
import { httpResponseWith } from '../../support/http-response.js';

describe('the parts of a request a view reads', () => {
    it('reads the file only a binary body sends', () => {
        expect(bodyFileOf({ file: 'files/a.png', type: 'binary' })).toBe('files/a.png');
        expect(bodyFileOf({ type: 'none' })).toBe('');
    });

    it('offers keeping the answer only once the send is done', () => {
        function keep(): void {
            return undefined;
        }

        expect(keepWhenDone({ response: httpResponseWith(), state: 'done' }, keep)).toBe(keep);
        expect(keepWhenDone({ state: 'idle' }, keep)).toBeUndefined();
        expect(keepWhenDone({ sendId: 's1', state: 'sending' }, keep)).toBeUndefined();
    });

    it('hands the answer to the one who keeps it, for a request that has a file', () => {
        const save = vi.fn(() => Promise.resolve());
        const response = httpResponseWith();
        const item = itemResource('Local', 'local', 'crear-pedido');
        const query = [{ enabled: true, key: 'fields', value: 'id' }];
        const keep = keepResponse(item, { query, response, state: 'done' }, save);

        keep?.();

        expect(save).toHaveBeenCalledWith(item, response, query);
        expect(keepResponse(item, { state: 'idle' }, save)).toBeUndefined();
    });

    it('does not offer keeping the answer of a request saved nowhere', () => {
        const loose = looseResource('Local', 'local', 'abc');

        expect(
            keepResponse(loose, { response: httpResponseWith(), state: 'done' }, () =>
                Promise.resolve(),
            ),
        ).toBeUndefined();
    });

    it('says why the code could not be written, and which file it could not carry', () => {
        expect(snippetFailure({ error: 'snippet-failed', state: 'failed' })).toBe('snippet-failed');
        expect(snippetFailure(null)).toBeNull();
        expect(snippetLeftOutFile({ code: 'curl', leftOutFile: 'a.png', state: 'ready' })).toBe(
            'a.png',
        );
        expect(snippetLeftOutFile({ state: 'loading' })).toBeNull();
    });
});
