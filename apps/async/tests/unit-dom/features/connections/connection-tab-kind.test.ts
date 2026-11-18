import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    connectionTitle,
    subscribeConnectionTitles,
} from '../../../../src/renderer/features/connections/connection-tab-kind.js';
import { connectionsStore } from '../../../../src/renderer/features/connections/index.js';

const RESOURCE = 'mandor://demo/payments/connection/alpha';

function seedConnection(name: string): void {
    connectionsStore.getState().upsertConnection({
        id: 'alpha',
        name,
        transport: 'websocket',
        url: 'wss://example.test/socket',
        headers: [],
        environmentId: null,
    });
}

afterEach(() => {
    connectionsStore.getState().reset();
});

describe('what the shell asks of the tab of a connection', () => {
    it('names the tab after the connection, or after nothing while the collection has not read it', () => {
        expect(connectionTitle(RESOURCE)).toBe('');

        seedConnection('Gateway');

        expect(connectionTitle(RESOURCE)).toBe('Gateway');
    });

    it('tells the tab when a rename changes its title', () => {
        const changed = vi.fn();
        const stop = subscribeConnectionTitles(changed);

        seedConnection('Gateway');
        stop();
        seedConnection('Pagos');

        expect(changed).toHaveBeenCalledTimes(1);
    });
});
