import { afterEach, describe, expect, it } from 'vitest';

import { docsStore } from '../src/docs-store.js';
import { docEntries } from '../src/lib/doc-entries.js';
import { workspaceDocEntries } from '../src/lib/workspace-doc-entries.js';

afterEach(() => {
    docsStore.getState().reset();
});

function say(key: string): string {
    return key;
}

describe('the docs the search of a workspace finds', () => {
    it('are the docs the store holds, under the origin and workspace it is asked for', () => {
        const docs = [
            { name: 'k3m9x2q7a4bd.md', title: 'Pedidos' },
            { name: 'p8w2n5c7e1fg.md', title: 'Eventos' },
        ];

        docsStore.setState({ docs });

        expect(workspaceDocEntries('Local', 'ws', say)).toEqual(docEntries(docs, 'Local', 'ws'));
    });

    it('are none while the store holds no doc', () => {
        expect(workspaceDocEntries('Local', 'ws', say)).toEqual([]);
    });
});
