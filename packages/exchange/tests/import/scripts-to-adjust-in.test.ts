import { describe, expect, it } from 'vitest';

import { scriptsToAdjustIn } from '../../src/import/lib/scripts-to-adjust-in.js';
import { entryOf, planOf } from '../support/plan-entries.js';

const BOTH = { onBeforeRequest: { source: 'pm.a();' }, onResponse: { source: 'pm.b();' } };

/** An entry whose resource brings `scripts`, marked or not. */
function bringing(route: string, scripts: unknown, selected = true) {
    const entry = entryOf('item', route);

    return { ...entry, selected, resource: { ...entry.resource, fields: { scripts } } };
}

describe('the scripts an import brings from another app', () => {
    it('adds up the moments every marked entry brings, folders and items alike', () => {
        const plan = planOf([
            bringing('pedidos/crear', BOTH),
            {
                ...bringing('pedidos', { onResponse: { source: 'x', enabled: false } }),
                place: 'folder',
            },
            entryOf('item', 'pedidos/ver'),
        ]);

        expect(scriptsToAdjustIn(plan)).toBe(3);
    });

    it('leaves out the entries not marked and the ones that write nothing', () => {
        const plan = planOf([
            bringing('pedidos/crear', BOTH, false),
            { ...bringing('pedidos/borrar', BOTH), resource: null },
        ]);

        expect(scriptsToAdjustIn(plan)).toBe(0);
    });

    it('leaves out what a bundle of Mandor brings: those scripts are no other app’s', () => {
        const entry = bringing('pedidos/crear', BOTH);
        const origin = { kind: 'mandor' as const, sourceId: 'm' };

        expect(
            scriptsToAdjustIn(planOf([{ ...entry, resource: { ...entry.resource, origin } }])),
        ).toBe(0);
    });

    it.each([['texto'], [null], [{ onResponse: 'texto' }]])(
        'counts nothing for scripts that are %j',
        (scripts) => {
            expect(scriptsToAdjustIn(planOf([bringing('pedidos/crear', scripts)]))).toBe(0);
        },
    );
});
