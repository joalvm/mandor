import { describe, expect, it } from 'vitest';

import { emitTo } from '../../src/testing/emit-to.js';

describe('delivering a push to the listeners of a test (emit-to)', () => {
    it('hands the push to every listener that is subscribed now', () => {
        const heard: string[] = [];
        const handlers = new Set<(push: string) => void>([
            (push) => heard.push(`a:${push}`),
            (push) => heard.push(`b:${push}`),
        ]);

        emitTo(handlers)('x');

        expect(heard).toEqual(['a:x', 'b:x']);
    });

    it('reads the set when it delivers, so a listener that left hears nothing', () => {
        const heard: string[] = [];
        const listener = (push: string): number => heard.push(push);
        const handlers = new Set([listener]);
        const emit = emitTo(handlers);

        handlers.delete(listener);
        emit('x');

        expect(heard).toEqual([]);
    });
});
