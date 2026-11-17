import type { Element } from 'hast';
import { describe, expect, it } from 'vitest';

import { docAlertOf } from '../src/lib/doc-alert.js';

function quote(properties: Element['properties']): Element {
    return { children: [], properties, tagName: 'blockquote', type: 'element' };
}

describe('the alert a quote of a doc was marked as', () => {
    it('is the kind its mark names', () => {
        expect(docAlertOf(quote({ dataAlert: 'warning' }))).toBe('warning');
    });

    it('is nothing for a plain quote, a kind GitHub does not have, or no node at all', () => {
        expect(docAlertOf(quote({}))).toBeUndefined();
        expect(docAlertOf(quote({ dataAlert: 'danger' }))).toBeUndefined();
        expect(docAlertOf(undefined)).toBeUndefined();
    });
});
