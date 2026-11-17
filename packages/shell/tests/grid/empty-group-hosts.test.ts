import type { DockviewApi } from 'dockview';
import { describe, expect, it } from 'vitest';

import { emptyGroupHosts } from '../../src/grid/empty-group-hosts.js';

function groupWith(id: string, blank: boolean) {
    const element = document.createElement('div');

    if (blank) {
        const watermark = document.createElement('div');

        watermark.className = 'dv-watermark';
        element.append(watermark);
    }

    return { element, id };
}

function apiOf(...groups: ReturnType<typeof groupWith>[]): DockviewApi {
    return { groups } as unknown as DockviewApi;
}

describe('where the empty groups keep their blank', () => {
    it('names the element of every group the library left blank', () => {
        const empty = groupWith('1', true);
        const full = groupWith('2', false);

        const hosts = emptyGroupHosts(apiOf(empty, full));

        expect(hosts).toEqual([['1', empty.element.firstElementChild]]);
    });

    it('names nothing while every group holds a tab', () => {
        expect(emptyGroupHosts(apiOf(groupWith('1', false)))).toEqual([]);
    });
});
