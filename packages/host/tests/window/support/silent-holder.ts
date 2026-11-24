import type { AppMenuHolder } from '../../../src/menu/app-menu-holder.js';
import type { OpenedMenu } from '../../../src/menu/install-app-menu.js';

export type { OpenedMenu };

/** The holder of the installed menu, with nothing to say about the language or the updates. */
export function holderOf<W>(menu: () => OpenedMenu<W>): AppMenuHolder<W> {
    return {
        current: menu,
        language: () => 'en',
        speak: () => undefined,
        updates: () => undefined,
    };
}
