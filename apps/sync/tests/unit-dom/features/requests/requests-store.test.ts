import type { RequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    createRequestsStore,
    type RequestsStoreApi,
} from '../../../../src/renderer/features/requests/requests-store.js';

function store(): RequestsStoreApi {
    return createRequestsStore();
}

const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};

describe('the requests store', () => {
    it('files what the disk said under the resource', () => {
        const requests = store();

        requests.getState().beginRead('r1');
        requests.getState().finishRead('r1', REQUEST);

        expect(requests.getState().requests['r1']).toEqual(REQUEST);
    });

    it('a read that brought nothing leaves the resource without an entry', () => {
        const requests = store();

        requests.getState().beginRead('r1');
        requests.getState().finishRead('r1', null);

        expect(requests.getState().requests['r1']).toBeUndefined();
        expect(requests.getState().reading).toEqual([]);
    });

    it('a read in flight is named while it lasts', () => {
        const requests = store();

        requests.getState().beginRead('r1');

        expect(requests.getState().reading).toEqual(['r1']);

        requests.getState().finishRead('r1', REQUEST);

        expect(requests.getState().reading).toEqual([]);
    });

    it('what the panel edited sits in front of the write', () => {
        const requests = store();

        requests.getState().finishRead('r1', REQUEST);
        requests.getState().setRequest('r1', { ...REQUEST, method: 'POST' });

        expect(requests.getState().requests['r1']?.method).toBe('POST');
    });

    it('reset brings the empty shelf back', () => {
        const requests = store();

        requests.getState().finishRead('r1', REQUEST);
        requests.getState().reset();

        expect(requests.getState().requests).toEqual({});
    });

    it('clears the answer of the last send, and only of that resource', () => {
        const requests = store();

        requests.getState().beginSend('r1', 's1');
        requests.getState().beginSend('r2', 's2');
        requests.getState().clearSend('r1');

        expect(Object.keys(requests.getState().sends)).toEqual(['r2']);
    });

    describe('when the last view of a request is gone', () => {
        it('forgets what was loaded, what was being read and the last answer', () => {
            const requests = store();

            requests.getState().beginRead('r1');
            requests.getState().finishRead('r1', REQUEST);
            requests.getState().beginRead('r1');
            requests.getState().beginSend('r1', 's1');
            requests.getState().setRequest('r2', REQUEST);
            requests.getState().forget('r1');

            expect(requests.getState().requests).toEqual({ r2: REQUEST });
            expect(requests.getState().reading).toEqual([]);
            expect(requests.getState().sends).toEqual({});
        });

        it('does not bring it back when a read or a send lands after', () => {
            const requests = store();

            requests.getState().beginRead('r1');
            requests.getState().beginSend('r1', 's1');
            requests.getState().forget('r1');
            requests.getState().finishRead('r1', REQUEST);
            requests
                .getState()
                .finishSend('r1', 's1', { error: 'request-unreachable', state: 'failed' });

            expect(requests.getState().requests).toEqual({});
            expect(requests.getState().sends).toEqual({});
        });
    });

    describe('the drafts of the examples', () => {
        const EXAMPLE = { body: '', contentType: '', name: 'Creado', status: '200' };

        it('files a draft under the resource of the example, and takes it out', () => {
            const requests = store();

            requests.getState().setExampleDraft('e1', { example: EXAMPLE });
            requests.getState().setExampleDraft('e2', { example: EXAMPLE });
            requests.getState().clearExampleDraft('e1');

            expect(Object.keys(requests.getState().exampleDrafts)).toEqual(['e2']);
        });

        it('goes with the tab of the example, and reset brings the empty shelf back', () => {
            const requests = store();

            requests.getState().setExampleDraft('e1', { example: EXAMPLE });
            requests.getState().setExampleDraft('e2', { example: EXAMPLE });
            requests.getState().forget('e1');

            expect(Object.keys(requests.getState().exampleDrafts)).toEqual(['e2']);

            requests.getState().reset();

            expect(requests.getState().exampleDrafts).toEqual({});
        });

        it('moves the draft and the send of an example to its new resource', () => {
            const requests = store();

            requests.getState().setExampleDraft('e1', { example: EXAMPLE });
            requests.getState().beginSend('e1', 's1');
            requests.getState().moveExample('e1', 'e2');

            expect(Object.keys(requests.getState().exampleDrafts)).toEqual(['e2']);
            expect(Object.keys(requests.getState().sends)).toEqual(['e2']);
        });

        it('moves nothing of an example that has no draft and no send', () => {
            const requests = store();

            requests.getState().setExampleDraft('e3', { example: EXAMPLE });
            requests.getState().moveExample('e1', 'e2');

            expect(Object.keys(requests.getState().exampleDrafts)).toEqual(['e3']);
        });
    });
});
