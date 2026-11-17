import { describe, expect, it } from 'vitest';

import {
    diffResource,
    historyPartsOf,
    historyResource,
} from '../../../../src/renderer/features/history/lib/history-resource.js';
import { ID_A, ID_B } from '../../support/history-fixture.js';

describe('the resources of the history', () => {
    it('names the list of a workspace by its origin, and says so when read back', () => {
        const resource = historyResource('Local', 'demo');

        expect(resource).toBe('mandor://local/demo/history/all');
        expect(historyPartsOf(resource)).toEqual({ kind: 'all', workspaceId: 'demo' });
    });

    it('names two sends in the order of the columns, and says so when read back', () => {
        const resource = diffResource('Local', 'demo', ID_A, ID_B);

        expect(resource).toBe(`mandor://local/demo/history/${ID_A}/${ID_B}`);
        expect(historyPartsOf(resource)).toEqual({
            ids: [ID_A, ID_B],
            kind: 'diff',
            workspaceId: 'demo',
        });
    });

    it('never mistakes the same sends in the other order for the same comparison', () => {
        expect(diffResource('Local', 'demo', ID_A, ID_B)).not.toBe(
            diffResource('Local', 'demo', ID_B, ID_A),
        );
    });

    it.each([
        ['a resource of another kind', 'mandor://local/demo/item/orders/list'],
        ['a window resource', 'mandor://_app/workspaces'],
        ['text that is no resource', 'not a resource'],
        ['a path of the history that names one send', `mandor://local/demo/history/${ID_A}`],
        ['a path of the history that names three', 'mandor://local/demo/history/a/b/c'],
    ])('reads nothing from %s', (_name, resource) => {
        expect(historyPartsOf(resource)).toBeNull();
    });
});
