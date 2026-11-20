import { describe, expect, it } from 'vitest';

import { cssOf } from './theme-values.js';

/** The declarations of the last rule written for exactly this selector. */
function ruleFor(css: string, selector: string): string {
    const at = css.lastIndexOf(`${selector} {`);

    return at === -1 ? '' : (/{([^}]*)}/.exec(css.slice(at))?.[1] ?? '');
}

const ROWS = "[data-part='app-settings'] [data-part='settings-rows']";
const TITLE = "[data-part='app-settings'] [data-part='settings-group'] > h3";
const NEXT_ROW = "[data-part='app-settings'] [data-part='setting-row'] + [data-part='setting-row']";

/**
 * The settings of the app read as a list on the ground of the dialog, the way the preferences of
 * an API client are cut: a line under the title of each group and a line between its rows, and
 * no box around a group.
 */
describe('the groups of the settings of the app', () => {
    it('lays the rows of a group on the dialog, with no box around them', async () => {
        const rows = ruleFor(await cssOf('runtime.css'), ROWS);

        expect(rows).not.toMatch(/background|border|radius/);
    });

    it('draws a line under the title of a group and between its rows', async () => {
        const runtime = await cssOf('runtime.css');
        const line = '1px solid var(--border-subtle)';

        expect(ruleFor(runtime, TITLE)).toContain(`border-block-end: ${line}`);
        expect(ruleFor(runtime, NEXT_ROW)).toContain(`border-block-start: ${line}`);
    });
});
