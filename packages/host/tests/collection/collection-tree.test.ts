import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { collectionDir } from '@mandor/store-fs';
import { describe, expect, it } from 'vitest';

import { createNoticeOutbox } from '../../src/notice/raise-notice.js';
import { spyWindow } from '../../src/testing/handler-harness.js';
import { mountedWorkspace, WORKSPACE } from './support/mounted-workspace.js';

const window = spyWindow();
const logged: string[] = [];
const { repo, tree } = mountedWorkspace({
    notices: createNoticeOutbox(window),
    logger: {
        log: (_level, message) => {
            logged.push(message);
        },
        flush: () => Promise.resolve(),
    },
});

describe('reading a collection with a file that cannot be read', () => {
    it('keeps the rest of the tree, tells the name it carries to the window and the path to the log', async () => {
        const broken = join(collectionDir(repo(), WORKSPACE.workspaceId), 'pedidos', 'roto.yaml');

        await writeFile(broken, 'name: Pedido roto\nurl: [unclosed\n', 'utf8');

        const answer = await tree(WORKSPACE);

        expect(answer).toMatchObject({ ok: true });
        expect(window.sent).toHaveLength(1);
        expect(window.sent[0]?.[1]).toMatchObject({
            code: 'files-unreadable',
            params: { count: 1, names: ['Pedido roto'] },
        });
        expect(JSON.stringify(window.sent)).not.toContain(repo());
        expect(JSON.stringify(window.sent)).not.toContain('pedidos/roto');
        expect(logged.join('\n')).toContain(broken);
    });
});
