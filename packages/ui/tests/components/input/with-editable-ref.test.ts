import type { RefObject } from 'react';
import { describe, expect, it } from 'vitest';

import { withEditableRef } from '../../../src/components/input/with-editable-ref.js';

function ref(): RefObject<HTMLSpanElement | null> {
    return { current: null };
}

describe('withEditableRef', () => {
    it('hands the same node to the field and to the caller', () => {
        const owned = ref();
        const handed = ref();
        const node = document.createElement('span');

        withEditableRef(owned, handed)(node);

        expect(owned.current).toBe(node);
        expect(handed.current).toBe(node);
    });

    it('keeps the node for the field alone when nobody asked for it', () => {
        const owned = ref();
        const node = document.createElement('span');

        withEditableRef(owned, undefined)(node);

        expect(owned.current).toBe(node);
    });

    it('clears both holders when the node goes away', () => {
        const owned = ref();
        const handed = ref();
        const fill = withEditableRef(owned, handed);

        fill(document.createElement('span'));
        fill(null);

        expect(owned.current).toBeNull();
        expect(handed.current).toBeNull();
    });
});
