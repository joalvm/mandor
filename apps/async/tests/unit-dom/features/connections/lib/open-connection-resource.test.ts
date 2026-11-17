import { ROOT_GROUP_ID } from '@mandor/ipc';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it } from 'vitest';

import { openConnectionResource } from '../../../../../src/renderer/features/connections/lib/open-connection-resource.js';

beforeEach(() => {
    shellStore.getState().reset();
});

describe('what the open tabs call a connection', () => {
    it('names the resource of the tab that shows the connection', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'echo',
            kind: 'connection',
            resource: 'mandor://local-apis/events/connection/echo',
        });

        expect(openConnectionResource('echo')).toBe('mandor://local-apis/events/connection/echo');
    });

    it('names nothing for a connection no tab shows', () => {
        shellStore.getState().openTab(ROOT_GROUP_ID, {
            id: 'echo',
            kind: 'connection',
            resource: 'mandor://local-apis/events/connection/echo',
        });

        expect(openConnectionResource('other')).toBeUndefined();
    });

    it('names nothing while the window has no tab', () => {
        expect(openConnectionResource('echo')).toBeUndefined();
    });
});
