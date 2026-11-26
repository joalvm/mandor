import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import { tokenValues } from '../../src/styles/token-values.js';
import { cssOf, declarationsOf } from './theme-values.js';

const UI_DIR = join(process.cwd(), 'packages', 'ui');
const SOURCE_DIR = join(UI_DIR, 'src');
const GENERATED_COLOR_FILES = new Set([
    'styles/token-accent-values.ts',
    'styles/token-color-values.ts',
    'styles/token-contrast-values.ts',
    'styles/token-scale-values.ts',
    'styles/token-values.ts',
]);
const COLOR_SOURCE_FILE = 'styles/primitives.css';
const SCALE_NAMES = [
    'text-3xs-size',
    'text-2xs-size',
    'text-xs-size',
    'text-sm-size',
    'text-md-size',
    'text-lg-size',
    'text-xl-size',
    'text-code-size',
    'height-row-xs',
    'height-control-sm',
    'height-row',
    'height-control',
    'height-header',
    'height-titlebar',
    'height-statusbar',
    'width-sidebar',
    'width-settings-nav',
    'width-setting-control',
    'width-dialog-confirm',
    'width-dialog-form',
    'width-dialog-sections',
    'height-dialog-sections',
    'margin-dialog-window',
    'width-dialog-code',
    'height-dialog-code',
    'pad-inline-dialog',
    'radius-none',
    'radius-sm',
    'radius-md',
    'radius-lg',
    'radius-xl',
    'radius-full',
    'icon-sm',
    'icon-md',
    'icon-lg',
    'icon-app',
    'z-base',
    'z-sticky',
    'z-splitter',
    'z-dropdown',
    'z-popover',
    'z-tooltip',
    'z-dialog',
    'z-toast',
    'z-drag',
    'duration-fast',
    'duration-base',
    'duration-slow',
    'ease-out',
    'ease-in',
] as const;

describe('the token source of truth', () => {
    it('makes the renderer root fill the whole desktop viewport', async () => {
        const base = await cssOf('base.css');

        expect(base).toContain(':where(html, body, #root)');
        expect(base).toMatch(/:where\(html, body, #root\)\s*{[^}]*height:\s*100%;/s);
    });

    /**
     * No overlay is requested any more, so there is no native safe area to keep clear of: the
     * row is draggable in full and the controls the renderer paints are carved out of it.
     */
    it('makes the shared title bar draggable and carves its buttons out', async () => {
        const runtime = await cssOf('runtime.css');

        expect(runtime).toMatch(/\[data-part='titlebar'\][^{]*{[^}]*app-region:\s*drag;/s);
        expect(runtime).toMatch(
            /\[data-part='titlebar'\] :where\(button[^)]*\)[^{]*{[^}]*app-region:\s*no-drag;/s,
        );
        expect(runtime).not.toContain('titlebar-area');
    });

    /**
     * A semantic token without a `@theme` entry generates no utility, and a class that
     * produces nothing fails silently: a background that never appears is exactly such a
     * failure. Every authored color role must be reachable from Tailwind.
     */
    it('maps every authored surface, text, border and solid token to a Tailwind color', async () => {
        const [semantic, index] = await Promise.all([cssOf('semantic.css'), cssOf('index.css')]);
        const names = [...semantic.matchAll(/--((?:surface|text|border|solid)-[\w-]+):/g)].map(
            (match) => match[1] ?? '',
        );

        expect(names.length).toBeGreaterThan(0);

        for (const name of names) {
            expect(index).toContain(`--color-${name}: var(--${name})`);
        }
    });

    it('keeps authored color literals inside primitives.css', async () => {
        const names = await readdir(SOURCE_DIR, { recursive: true });
        const candidates = names.filter((name) => /\.(?:css|ts|tsx)$/.test(name));
        const violations: string[] = [];

        for (const name of candidates) {
            const path = name.replaceAll('\\', '/');

            if (path === COLOR_SOURCE_FILE || GENERATED_COLOR_FILES.has(path)) {
                continue;
            }

            const text = await readFile(join(SOURCE_DIR, name), 'utf8');

            if (/#[\da-f]{3,8}\b|(?:rgb|hsl|oklch)\(/i.test(text)) {
                violations.push(path);
            }
        }

        expect(violations).toEqual([]);
    });

    it('defines the complete geometry, typography and motion scales', async () => {
        const values = declarationsOf(await cssOf('scales.css'));

        expect(SCALE_NAMES.filter((name) => values[`mandor-${name}`] === undefined)).toEqual([]);
        expect(await cssOf('index.css')).toContain('@theme inline');
    });

    it('maps canonical tokens into Tailwind without circular aliases', async () => {
        const entry = await cssOf('index.css');
        const circular = [...entry.matchAll(/--([\w-]+):\s*var\(--\1\)/g)].map((match) => match[1]);

        expect(circular).toEqual([]);
        expect(entry).toContain('--color-surface-panel: var(--surface-panel)');
        expect(entry).toContain('--spacing-control: var(--mandor-height-control)');
        expect(entry).toContain('--radius-md: var(--mandor-radius-md)');
        expect(entry).toContain('@utility duration-fast');
        expect(entry).toContain('@utility z-dialog');
    });

    /**
     * The layers a control opens live above the surfaces that host them: a dropdown opens
     * inside a popover and inside a dialog, and all the portals hang off `body`, so only the
     * scale keeps a list from landing under the dialog it was opened from. The tooltip is the
     * last word a layer says, and the drag ghost and the toasts sit over everything.
     */
    it('stacks the dialog under the layers a control opens from it', async () => {
        const values = declarationsOf(await cssOf('scales.css'));
        const layer = (name: string): number => {
            const value = values[`mandor-z-${name}`];

            expect(value, `mandor-z-${name}`).toBeDefined();

            return Number(value);
        };

        expect(layer('base')).toBeLessThan(layer('sticky'));
        expect(layer('sticky')).toBeLessThan(layer('splitter'));
        expect(layer('splitter')).toBeLessThan(layer('dialog'));
        expect(layer('dialog')).toBeLessThan(layer('popover'));
        expect(layer('popover')).toBeLessThan(layer('dropdown'));
        expect(layer('dropdown')).toBeLessThan(layer('tooltip'));
        expect(layer('tooltip')).toBeLessThan(layer('toast'));
        expect(layer('toast')).toBeLessThan(layer('drag'));
    });

    /**
     * A theme is read wherever `data-theme` names it, not only on the root: the miniature of a
     * theme sits inside a window of another one. A high-contrast theme that only laid its raised
     * tokens would take the rest from that window and paint the wrong scheme.
     */
    it('lays the whole colour scheme under a high-contrast theme wherever it is named', async () => {
        const [light, dark] = await Promise.all([
            cssOf('semantic.css'),
            cssOf('semantic-dark.css'),
        ]);

        expect(light).toMatch(/\[data-theme='light'\],\s*\[data-theme='light-contrast'\]\s*{/);
        expect(dark).toMatch(/\[data-theme='dark'\],\s*\[data-theme='dark-contrast'\]\s*{/);
    });

    it('keeps generated token files synchronized', () => {
        const result = spawnSync(process.execPath, ['tools/build-tokens.mjs', '--check'], {
            cwd: UI_DIR,
            encoding: 'utf8',
        });

        expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
        expect(tokenValues.light['surface-app']).toMatch(/^#[\da-f]{6}$/i);
        expect(tokenValues.dark['surface-app']).toMatch(/^#[\da-f]{6}$/i);
    });

    /**
     * A high-contrast theme is its colour scheme with a few tokens raised, so it carries every
     * token of it and differs in nothing else: a token dropped from the generated modules would
     * paint nothing in the one theme a reader chose to see better.
     */
    it('generates the high-contrast themes as their colour scheme with the raised tokens changed', () => {
        const raised = (contrast: Record<string, string>, base: Record<string, string>) =>
            Object.keys(contrast).filter((name) => contrast[name] !== base[name]);

        expect(Object.keys(tokenValues.lightContrast)).toEqual(Object.keys(tokenValues.light));
        expect(Object.keys(tokenValues.darkContrast)).toEqual(Object.keys(tokenValues.dark));
        expect(raised(tokenValues.lightContrast, tokenValues.light)).toContain('border-subtle');
        expect(raised(tokenValues.darkContrast, tokenValues.dark)).toContain('border-subtle');
        expect(raised(tokenValues.lightContrast, tokenValues.light)).not.toContain('surface-app');
        expect(raised(tokenValues.darkContrast, tokenValues.dark)).not.toContain('surface-app');
    });
});
