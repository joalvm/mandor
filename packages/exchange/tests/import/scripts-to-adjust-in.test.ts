import type { ImportPlan } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { scriptsToAdjustIn } from '../../src/import/lib/scripts-to-adjust-in.js';
import { entryOf, planOf } from '../support/plan-entries.js';

const SCRIPT = { event: 'onBeforeRequest', dialect: 'postman', source: 'pm.test("ok");' };

/** An entry whose resource brings `count` scripts of another app, marked or not. */
function bringing(route: string, count: number, selected = true): ImportPlan['entries'][number] {
    const entry = entryOf('item', route);

    return {
        ...entry,
        selected,
        resource: { ...entry.resource, fields: { importedScripts: Array(count).fill(SCRIPT) } },
    };
}

describe('the scripts an import leaves to adjust', () => {
    it('adds up what every marked entry brings, folders and items alike', () => {
        const plan = planOf([
            bringing('pedidos/crear', 2),
            { ...bringing('pedidos', 1), place: 'folder' },
            entryOf('item', 'pedidos/ver'),
        ]);

        expect(scriptsToAdjustIn(plan)).toBe(3);
    });

    it('leaves out the entries not marked and the ones that write nothing', () => {
        const plan = planOf([
            bringing('pedidos/crear', 2, false),
            { ...bringing('pedidos/borrar', 1), resource: null },
        ]);

        expect(scriptsToAdjustIn(plan)).toBe(0);
    });

    it('counts nothing for a field that is not a list of scripts', () => {
        const entry = entryOf('item', 'pedidos/crear');
        const plan = planOf([
            { ...entry, resource: { ...entry.resource, fields: { importedScripts: 'texto' } } },
        ]);

        expect(scriptsToAdjustIn(plan)).toBe(0);
    });
});
