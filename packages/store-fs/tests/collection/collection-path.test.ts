import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
    collectionsFile,
    folderDir,
    folderFile,
    itemFile,
} from '../../src/collection/collection-path.js';

const ROOT = 'repo';

/** Where a collection path lies on this system: the separator is the one of the platform. */
function under(...parts: string[]): string {
    return join(ROOT, 'workspaces', 'pagos', 'collections', ...parts);
}

describe('where the collection lives', () => {
    it('names the root file of the collection', () => {
        expect(collectionsFile(ROOT, 'pagos')).toBe(under('collections.yaml'));
    });

    it('names the directory of one folder and its file', () => {
        expect(folderDir(ROOT, 'pagos', 'pedidos')).toBe(under('pedidos'));
        expect(folderFile(ROOT, 'pagos', 'pedidos')).toBe(under('pedidos', 'folder.yaml'));
    });

    it('names the file of one item, keeping the extension out of the path', () => {
        expect(itemFile(ROOT, 'pagos', 'pedidos/crear')).toBe(under('pedidos', 'crear.yaml'));
    });
});
