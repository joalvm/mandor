import { describe, expect, it } from 'vitest';

import { groupsNamed } from '../../src/grid/group-names.js';

function groupWith(id: string) {
    return { element: document.createElement('div'), id };
}

function apiOf(...groups: ReturnType<typeof groupWith>[]): Parameters<typeof groupsNamed>[0] {
    return { groups };
}

describe('saying which group of the window each one is', () => {
    it('describes every group on the element that takes the focus', () => {
        const first = groupWith('root');
        const second = groupWith('group-2');

        groupsNamed(apiOf(first, second), [
            ['root', 'Group 1 of 2'],
            ['group-2', 'Group 2 of 2'],
        ]);

        expect(first.element.getAttribute('aria-description')).toBe('Group 1 of 2');
        expect(second.element.getAttribute('aria-description')).toBe('Group 2 of 2');
    });

    it('leaves a group nobody named without a description', () => {
        const stranger = groupWith('group-9');

        groupsNamed(apiOf(stranger), [['root', 'Group 1 of 1']]);

        expect(stranger.element.hasAttribute('aria-description')).toBe(false);
    });
});
