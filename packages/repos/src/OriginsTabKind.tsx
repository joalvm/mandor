import { registerSurface, TabBody, TabKind } from '@mandor/shell';
import { useEffect } from 'react';

import { OriginsPanel } from './components/panel/OriginsPanel.js';
import { openOriginsTab, ORIGINS_TAB_KIND } from './lib/open-origins-tab.js';

type OriginsTabKindProps = {
    /** Switching has an order only the app knows, so the tab asks the app to run it. */
    onSwitch: (id: string) => void;
};

/** The management tab of the origins, and the surface the rest of the window reaches it by. */
export function OriginsTabKind({ onSwitch }: OriginsTabKindProps) {
    useEffect(
        () =>
            registerSurface({
                id: 'origins',
                open: () => {
                    openOriginsTab();
                },
            }),
        [],
    );

    return (
        <TabKind
            closable
            icon="origin-remote"
            id={ORIGINS_TAB_KIND}
            title={(_resource, translate) => translate('origins:heading')}
        >
            <TabBody>
                <OriginsPanel onSwitch={onSwitch} />
            </TabBody>
        </TabKind>
    );
}
