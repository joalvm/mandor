import { describe, expect, it, vi } from 'vitest';

import { createAppMenuHolder } from '../../src/menu/app-menu-holder.js';
import type { UpdateMenu } from '../../src/menu/update-menu.js';

function deps() {
    const installed: string[][] = [];
    const holder = createAppMenuHolder({
        build: (language, updates) => [
            { label: `menu-${language}-${updates?.state.phase ?? 'none'}` },
        ],
        install: (template) => {
            installed.push(template.map((each) => each.label ?? ''));

            return { popup: vi.fn() };
        },
        kind: 'async',
    });

    return { holder, installed };
}

describe('the holder of the installed menu', () => {
    it('installs a menu before anyone asks, in the provisional language', () => {
        const { holder, installed } = deps();

        expect(installed).toHaveLength(1);
        expect(installed[0]).toEqual(['menu-en-none']);
        expect(holder.current()).toBeDefined();
    });

    it('rebuilds and reinstalls when the language changes', () => {
        const { holder, installed } = deps();

        holder.speak('es');

        expect(installed).toHaveLength(2);
        expect(installed[1]).toEqual(['menu-es-none']);
    });

    it('remembers the language spoken last, provisional until the window says one', () => {
        const { holder } = deps();

        expect(holder.language()).toBe('en');

        holder.speak('es');

        expect(holder.language()).toBe('es');
    });

    it('answers the popup with the menu of the last language spoken', () => {
        const { holder } = deps();

        const before = holder.current();

        holder.speak('es');

        expect(before).not.toBe(holder.current());
    });

    describe('with the updates', () => {
        function updateMenu(phase: UpdateMenu['state']['phase'], progress?: number): UpdateMenu {
            return {
                state: { phase, support: 'full', current: '0.1.0', progress },
                run: vi.fn(),
            };
        }

        it('rebuilds when an entry of the menu would change, and only then', () => {
            const { holder, installed } = deps();

            holder.updates(updateMenu('idle'));
            holder.updates(updateMenu('idle'));
            holder.updates(updateMenu('downloading', 10));
            holder.updates(updateMenu('downloading', 90));
            holder.updates(updateMenu('ready'));

            expect(installed.map((each) => each[0])).toEqual([
                'menu-en-none',
                'menu-en-idle',
                'menu-en-downloading',
                'menu-en-ready',
            ]);
        });

        it('keeps what they said when the language changes', () => {
            const { holder, installed } = deps();

            holder.updates(updateMenu('ready'));
            holder.speak('es');

            expect(installed.at(-1)).toEqual(['menu-es-ready']);
        });
    });
});
