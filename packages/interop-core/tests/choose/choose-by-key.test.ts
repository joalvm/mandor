import { describe, expect, it } from 'vitest';

import { chooseByKey, type KeyHandlers } from '../../src/choose/choose-by-key.js';

type Shape =
    { kind: 'circle'; radius: number } | { kind: 'square'; side: number } | { kind: 'dot' };

type Tagged = { type: 'text'; content: string } | { type: 'count'; total: number };

const WIDTHS: KeyHandlers<'kind', Shape, number> = {
    circle: (circle) => circle.radius * 2,
    square: (square) => square.side,
    dot: () => 0,
};

const LABELS: KeyHandlers<'type', Tagged, string> = {
    text: (tagged) => tagged.content,
    count: (tagged) => String(tagged.total),
};

describe('choosing by the key of a union', () => {
    it('hands each member to the handler its key names', () => {
        const shapes: Shape[] = [
            { kind: 'circle', radius: 3 },
            { kind: 'square', side: 4 },
            { kind: 'dot' },
        ];

        const widths = shapes.map((shape) => chooseByKey(WIDTHS, shape.kind, shape));

        expect(widths).toEqual([6, 4, 0]);
    });

    it('works with any name for the key', () => {
        const labels = (
            [
                { type: 'text', content: 'a' },
                { type: 'count', total: 2 },
            ] satisfies Tagged[]
        ).map((tagged) => chooseByKey(LABELS, tagged.type, tagged));

        expect(labels).toEqual(['a', '2']);
    });
});
