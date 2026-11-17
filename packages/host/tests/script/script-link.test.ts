import type { WorkerMessage } from '@mandor/script';
import { describe, expect, it } from 'vitest';

import { newScriptLink } from '../../src/script/script-link.js';

function newLink() {
    const posted: WorkerMessage[] = [];
    const own = newScriptLink('r1', {
        postMessage: (message) => {
            posted.push(message);
        },
    });

    return { ...own, posted };
}

describe('the link of a run', () => {
    it('posts a send and a wait as messages of its run', () => {
        const { link, posted } = newLink();

        link.send('s1', 'ask');
        link.waiting();

        expect(posted).toEqual([
            { kind: 'send', runId: 'r1', sendId: 's1', payload: 'ask' },
            { kind: 'waiting', runId: 'r1' },
        ]);
    });

    it('hands the engine an answer that came before it asked', async () => {
        const { link, accept } = newLink();

        accept({ sendId: 's1', reply: 'a' });
        accept({ sendId: 's2', reply: 'b' });

        expect(await link.nextAnswer()).toEqual({ sendId: 's1', reply: 'a' });
        expect(await link.nextAnswer()).toEqual({ sendId: 's2', reply: 'b' });
    });

    it('hands the engine the answer that comes while it waits for one', async () => {
        const { link, accept } = newLink();
        const waiting = link.nextAnswer();

        accept({ sendId: 's1', reply: 'a' });

        expect(await waiting).toEqual({ sendId: 's1', reply: 'a' });
    });
});
