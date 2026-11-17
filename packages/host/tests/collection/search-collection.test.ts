import { describe, expect, it } from 'vitest';

import { setActiveOrigin } from '../../src/origin/active-origin.js';
import { searchCollection } from '../../src/collection/search-collection.js';

describe('answering one search of the collection', () => {
    it('refuses a request that names no query', async () => {
        await expect(searchCollection({ workspaceId: 'api' })).resolves.toMatchObject({
            ok: false,
            error: { code: 'bad-request' },
        });
    });

    it('is told there is nowhere to search when no origin is open', async () => {
        setActiveOrigin(null);

        await expect(searchCollection({ workspaceId: 'api', query: 'x' })).resolves.toMatchObject({
            ok: false,
        });
    });
});
