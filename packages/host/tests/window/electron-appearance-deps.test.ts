import { describe, expect, it, vi } from 'vitest';

import { electronAppearanceDeps } from '../../src/window/electron-appearance-deps.js';

const nativeTheme = vi.hoisted(() => ({ themeSource: 'system' }));

vi.mock('electron', () => ({ nativeTheme }));

describe('the appearance dependencies over the real app', () => {
    it('set the scheme the system draws its own parts in', () => {
        electronAppearanceDeps().setSource('light');

        expect(nativeTheme.themeSource).toBe('light');
    });
});
