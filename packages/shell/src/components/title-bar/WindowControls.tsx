import { useMessages } from '@mandor/i18n';
import { cn, WindowButton } from '@mandor/ui';
import { useEffect, useState } from 'react';

import { bridge } from '../../bridge.js';
import { fireAndForget } from '../../fire-and-forget.js';
import { isApplePlatform } from '../../shortcut/apple-platform.js';

type WindowControlsProps = {
    className?: string;
};

/**
 * The three window controls the renderer owns, at the end of the title row. On macOS the
 * system keeps drawing the traffic lights, so there is nothing for this component to add and
 * it renders nothing at all.
 *
 * What each one looks like is the primitive's business; what this component knows is which three
 * there are, what they are called, and which call of the bridge each one makes.
 */
export function WindowControls({ className }: WindowControlsProps) {
    const messages = useMessages('shell');
    const [maximized, setMaximized] = useState(false);

    useEffect(
        () =>
            bridge.window.onMaximizedChange((push) => {
                setMaximized(push.maximized);
            }),
        [],
    );

    if (isApplePlatform()) {
        return null;
    }

    return (
        <div
            className={cn('flex h-full shrink-0 items-stretch', className)}
            data-part="window-controls"
        >
            <WindowButton
                icon="window-minimize"
                label={messages('windowMinimize')}
                onClick={() => {
                    fireAndForget(bridge.window.minimize());
                }}
            />
            <WindowButton
                icon={maximized ? 'window-restore' : 'window-maximize'}
                label={maximized ? messages('windowRestore') : messages('windowMaximize')}
                onClick={() => {
                    fireAndForget(bridge.window.toggleMaximize());
                }}
            />
            <WindowButton
                icon="window-close"
                label={messages('windowClose')}
                onClick={() => {
                    fireAndForget(bridge.window.close());
                }}
                variant="close"
            />
        </div>
    );
}
