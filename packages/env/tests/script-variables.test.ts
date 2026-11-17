import { describe, expect, it } from 'vitest';

import { droppedScriptVariables, shownScriptVariables } from '../src/lib/script-variables.js';

const A = { name: 'a', preview: '1' };
const B = { name: 'b', preview: '2' };

describe('what scripts set, by workspace and environment', () => {
    it('replaces the list of one environment and leaves the others where they were', () => {
        const all = { pagos: { prod: [A], dev: [A] }, otro: { prod: [A] } };

        expect(shownScriptVariables(all, 'pagos', 'prod', [B])).toEqual({
            pagos: { prod: [B], dev: [A] },
            otro: { prod: [A] },
        });
    });

    it('opens the workspace the first time a script sets something in it', () => {
        expect(shownScriptVariables({}, 'pagos', '', [B])).toEqual({ pagos: { '': [B] } });
    });

    it('forgets one workspace whole and nothing of the others', () => {
        const all = { pagos: { prod: [A] }, otro: { prod: [B] } };

        expect(droppedScriptVariables(all, 'pagos')).toEqual({ otro: { prod: [B] } });
        expect(droppedScriptVariables(all, 'nadie')).toEqual(all);
    });
});
