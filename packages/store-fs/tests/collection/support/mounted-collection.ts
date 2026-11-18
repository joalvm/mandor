import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { collectionDir } from '../../../src/index.js';

/**
 * Writes a collection the way a repo arrives from git: plain files, no writer of ours involved.
 * A reading test that used our own writer would only prove the two agree.
 */
export async function mountCollection(
    root: string,
    workspaceId: string,
    files: Record<string, string>,
): Promise<void> {
    for (const [name, contents] of Object.entries(files)) {
        const path = join(collectionDir(root, workspaceId), name);

        await mkdir(join(path, '..'), { recursive: true });
        await writeFile(path, contents, 'utf8');
    }
}

export const TWO_FOLDERS: Record<string, string> = {
    'collections.yaml': 'order:\n  - pedidos\n  - envios\n',
    'pedidos/collection.yaml': 'name: Pedidos\norder:\n  - pedido-pagado\n  - pedido-creado\n',
    'pedidos/pedido-creado.yaml': 'kind: message\nname: Pedido creado\ntags:\n  - pagos\n',
    'pedidos/pedido-pagado.yaml': 'kind: message\nname: Pedido pagado\n',
    'envios/collection.yaml': 'name: Envios\norder:\n  - envio-creado\n',
    'envios/envio-creado.yaml': 'kind: message\nname: Envio creado\n',
    'envios/envio-entregado.yaml': 'kind: message\nname: Envio entregado\n',
};
