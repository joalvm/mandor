import { describe, expect, it } from 'vitest';

import { checksToRun, scopeOf } from '../../ci/changed-scope.mjs';

describe('what a pull request runs once its earlier proof is read (checksToRun)', () => {
    const FULL = { e2e: true, macos: true };

    it('runs every check with nothing to reuse', () => {
        expect(checksToRun(FULL, new Set(), [])).toEqual({
            e2e: true,
            macos: true,
            'verify-windows': true,
            'e2e-windows-async': true,
            'e2e-windows-sync': true,
            'e2e-macos-async': true,
            'e2e-macos-sync': true,
        });
    });

    it('leaves out what was proven, and runs what failed', () => {
        const reused = new Set(['verify (windows-latest)', 'e2e sync (windows-latest)']);

        expect(checksToRun(FULL, reused, [])).toEqual({
            e2e: true,
            macos: true,
            'verify-windows': false,
            'e2e-windows-async': true,
            'e2e-windows-sync': false,
            'e2e-macos-async': true,
            'e2e-macos-sync': true,
        });
    });

    /** The protected macOS check still waits for the apps: only the proven one is left out. */
    it('leaves out a macOS app once it was proven', () => {
        const checks = checksToRun(FULL, new Set(['e2e async (macos-latest)']), []);

        expect(checks.macos).toBe(true);
        expect(checks['e2e-macos-async']).toBe(false);
        expect(checks['e2e-macos-sync']).toBe(true);
    });

    /** A label is a request to run: it is not satisfied by an earlier run. */
    it('runs both macOS apps when the label asks for it, proven or not', () => {
        const reused = new Set(['e2e async (macos-latest)', 'e2e sync (macos-latest)']);
        const checks = checksToRun(FULL, reused, ['e2e:macos']);

        expect(checks['e2e-macos-async']).toBe(true);
        expect(checks['e2e-macos-sync']).toBe(true);
    });

    it('opens no window a change of prose does not reach, with nothing reused', () => {
        expect(checksToRun({ e2e: false, macos: false }, new Set(), [])).toEqual({
            e2e: false,
            macos: false,
            'verify-windows': true,
            'e2e-windows-async': false,
            'e2e-windows-sync': false,
            'e2e-macos-async': false,
            'e2e-macos-sync': false,
        });
    });
});

describe('what a pull request has to run (scopeOf)', () => {
    /** Prose reaches no window: the end-to-end runs would open the same app twice for nothing. */
    it('opens no window for a change that only touches prose', () => {
        expect(
            scopeOf(['docs/plans/hito-5/README.md', 'skills/testing/SKILL.md', 'AGENTS.md'], []),
        ).toEqual({ e2e: false, macos: false });
    });

    it('opens the windows of Linux and Windows for any change of code', () => {
        expect(scopeOf(['packages/collections/src/collection-store.ts'], [])).toEqual({
            e2e: true,
            macos: false,
        });
    });

    /**
     * A macOS minute is billed as ten. The window there only behaves differently where the app
     * meets the system: the main process, the preload, the host, the chrome of the window, how it
     * is packaged and the Electron it ships with.
     */
    it.each([
        'apps/async/src/main/start-async.ts',
        'apps/sync/src/preload/index.ts',
        'packages/host/src/window/create-window.ts',
        'packages/shell/src/components/title-bar/WindowControls.tsx',
        'apps/sync/electron-builder.yml',
        'apps/async/electron.vite.config.ts',
        'apps/async/resources/icon.icns',
        'apps/sync/package.json',
        'package-lock.json',
        'apps/async/tests/e2e/hito-4.spec.ts',
        'apps/sync/playwright.config.ts',
        '.github/workflows/ci.yml',
        '.github/actions/unscanned-workspace/action.yml',
    ])('opens the window of macOS when %s changes', (file) => {
        expect(scopeOf(['docs/notes.md', file], [])).toEqual({ e2e: true, macos: true });
    });

    it('opens the window of macOS when the pull request asks for it by label', () => {
        expect(scopeOf(['packages/vars/src/resolve.ts'], ['e2e:macos'])).toEqual({
            e2e: true,
            macos: true,
        });
    });

    /** A label is a request to run, not a reason to run less: prose with the label still opens. */
    it('opens every window for a labelled change, even of prose', () => {
        expect(scopeOf(['docs/notes.md'], ['e2e:macos'])).toEqual({ e2e: true, macos: true });
    });

    /** No list of files is no evidence: an empty diff runs everything rather than nothing. */
    it('runs everything when it cannot tell what changed', () => {
        expect(scopeOf([], [])).toEqual({ e2e: true, macos: true });
    });
});
