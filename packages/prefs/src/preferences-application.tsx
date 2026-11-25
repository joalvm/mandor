import { MessagesProvider } from '@mandor/i18n';
import { updateConfigureRequestSchema } from '@mandor/ipc';
import { bridge, fireAndForget } from '@mandor/shell';
import { setTextZoom, watchTextZoom } from '@mandor/ui';
import { useEffect, useLayoutEffect, type PropsWithChildren } from 'react';

import { useAppliedCodePreferences } from './hooks/useAppliedCodePreferences.js';
import { useAppliedTabPreferences } from './hooks/useAppliedTabPreferences.js';
import { usePreferences } from './preferences-context.js';
import { readTextZoom, writeTextZoom } from './text-zoom-storage.js';
import { useAppliedTheme } from './theme/useAppliedTheme.js';

type PreferencesApplicationProps = PropsWithChildren;

export function PreferencesApplication({ children }: PreferencesApplicationProps) {
    const { values } = usePreferences();
    const language = values['appearance.language'];
    const density = values['appearance.density'];
    const motion = values['appearance.motion'];
    const { source, theme } = useAppliedTheme();
    const mode = values['updates.mode'];
    const channel = values['updates.channel'];

    useAppliedTabPreferences(values);
    useAppliedCodePreferences(values);

    // The size the reader left the text at comes back with the window, before its first paint, and
    // is kept at every change. It belongs to the window for as long as it is open: deps stay empty.
    useLayoutEffect(() => {
        setTextZoom(readTextZoom());

        return watchTextZoom(writeTextZoom);
    }, []);

    // Before the first paint, so a window that is not drawn in the theme of the reader never
    // flashes the one of the system first. The theme is always named, the system's included: the
    // stylesheets keep following the system only for the instant before the preferences load.
    useLayoutEffect(() => {
        const root = document.documentElement;

        root.dataset['theme'] = theme;

        return () => {
            root.removeAttribute('data-theme');
        };
    }, [theme]);

    // Before the first paint too: the compact density moves every panel, so drawing the window
    // comfortable first would make it jump.
    useLayoutEffect(() => {
        const root = document.documentElement;

        root.dataset['density'] = density;

        return () => {
            root.removeAttribute('data-density');
        };
    }, [density]);

    // Before the first paint as well, so a layer opened at once already moves as chosen. Following
    // the system names nothing: the stylesheets then read what the system asks for.
    useLayoutEffect(() => {
        const root = document.documentElement;

        if (motion === 'system') {
            root.removeAttribute('data-motion');
        } else {
            root.dataset['motion'] = motion;
        }

        return () => {
            root.removeAttribute('data-motion');
        };
    }, [motion]);

    // Main draws what the window cannot reach: its frame, its menus, its native dialogs. It follows
    // the system unless the reader holds a theme, and the window reads the system's appearance
    // from it, so nothing but `system` is ever sent while the system picks.
    useEffect(() => {
        fireAndForget(bridge.app.configureAppearance({ source }));
    }, [source]);

    // What language the window is being read in, said where anything can read it: a screen
    // reader pronounces the page by it, and the editor picks its own messages off it. A layout
    // effect, because the effects of what the window holds run before the ones of the window, and
    // an editor restored open would load its messages before a plain effect said the language.
    useLayoutEffect(() => {
        document.documentElement.lang = language;

        return () => {
            document.documentElement.removeAttribute('lang');
        };
    }, [language]);

    // Main looks for versions by itself and cannot read the settings, which live in this window:
    // it is told what the person chose once the window is up and at every change.
    useEffect(() => {
        const choice = updateConfigureRequestSchema.safeParse({ mode, channel });

        if (choice.success) {
            fireAndForget(bridge.update.configure(choice.data));
        }
    }, [mode, channel]);

    return <MessagesProvider preferences={{ language }}>{children}</MessagesProvider>;
}
