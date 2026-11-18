import { useMessages } from '@mandor/i18n';
import { IconButton } from '@mandor/ui';
import type { MouseEvent } from 'react';

import { bridge } from '../../bridge.js';
import { fireAndForget } from '../../fire-and-forget.js';
import { isApplePlatform } from '../../shortcut/apple-platform.js';

/**
 * The button that opens the options menu where the platform puts one inside the window: at the
 * start of the title row on Windows and Linux, nowhere at all on macOS, where the same menu
 * lives in the system menu bar.
 */
export function AppMenuButton() {
    const messages = useMessages('shell');

    const open = (event: MouseEvent<HTMLButtonElement>): void => {
        const corner = event.currentTarget.getBoundingClientRect();

        fireAndForget(bridge.window.popupAppMenu({ x: corner.left, y: corner.bottom }));
    };

    if (isApplePlatform()) {
        return null;
    }

    return <IconButton icon="menu" label={messages('appMenu')} onClick={open} size="md" />;
}
