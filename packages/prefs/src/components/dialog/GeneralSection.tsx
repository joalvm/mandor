import { PreferenceRows } from './PreferenceRows.js';

/**
 * What every app opens its settings with: the language first, then how the window lays out its
 * panels and treats its tabs, then how its editors write.
 */
export function GeneralSection() {
    return (
        <div className="flex flex-col gap-gap-section" data-part="general-section">
            <PreferenceRows section="general" titleKey="preferences:language" />
            <PreferenceRows section="interface" titleKey="preferences:interfaceGroup" />
            <PreferenceRows section="editor" titleKey="preferences:editorGroup" />
        </div>
    );
}
