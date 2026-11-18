import { useTranslator } from '@mandor/i18n';
import { Icon, type IconName } from '@mandor/icons';
import { THEME_IDS, type PreferenceKey, type ThemeId } from '@mandor/schema';
import { Badge, Select } from '@mandor/ui';

import { usePreferences } from '../../preferences-context.js';
import { themeChoiceOf } from '../../theme/resolve-theme.js';
import { useAppliedTheme } from '../../theme/useAppliedTheme.js';
import { ThemePreview } from './ThemePreview.js';

/** The three places a theme is chosen for: the day, the night, and the one a reader holds. */
export type ThemeSlot = 'day' | 'manual' | 'night';

type ThemeCardProps = {
    slot: ThemeSlot;
};

type SlotKind = {
    help: string;
    icon: IconName;
    options: readonly ThemeId[];
    preference: PreferenceKey;
    title: string;
};

const SLOTS: Record<ThemeSlot, SlotKind> = {
    day: {
        help: 'preferences:themeDayHelp',
        icon: 'preview',
        options: ['light', 'light-contrast'],
        preference: 'appearance.themeDay',
        title: 'preferences:themeDay',
    },
    manual: {
        help: 'preferences:themeManualHelp',
        icon: 'color-mode',
        options: THEME_IDS,
        preference: 'appearance.themeManual',
        title: 'preferences:themeManual',
    },
    night: {
        help: 'preferences:themeNightHelp',
        icon: 'color-mode',
        options: ['dark', 'dark-contrast'],
        preference: 'appearance.themeNight',
        title: 'preferences:themeNight',
    },
};

type ActiveBadgeProps = {
    active: boolean;
};

/** Says which card is the theme the window wears now; the other one is only waiting its turn. */
function ActiveBadge({ active }: ActiveBadgeProps) {
    const translate = useTranslator();

    if (!active) {
        return null;
    }

    return <Badge tone="accent">{translate('preferences:themeActive')}</Badge>;
}

/**
 * One place a theme is chosen for: what it is for, the miniature of the theme chosen and the
 * choice itself. The card reads and writes its own preference, and it is active when its theme
 * is the one the window is drawn in.
 */
export function ThemeCard({ slot }: ThemeCardProps) {
    const translate = useTranslator();
    const preferences = usePreferences();
    const applied = useAppliedTheme();
    const { help, icon, options, preference, title } = SLOTS[slot];
    const theme = themeChoiceOf(preferences.values)[slot];
    const heading = translate(title);

    return (
        <div
            aria-label={heading}
            className="flex min-w-0 flex-1 flex-col gap-gap-control rounded-lg border border-border-subtle p-pad-panel"
            data-part="theme-card"
            role="group"
        >
            <div className="flex items-center gap-gap-icon-text">
                <Icon name={icon} />
                <span className="text-sm font-semibold text-text-primary">{heading}</span>
                <ActiveBadge active={applied.theme === theme} />
            </div>
            <p className="text-xs text-text-secondary">{translate(help)}</p>
            <ThemePreview theme={theme} />
            <Select
                className="w-full"
                label={heading}
                onValueChange={(next) => {
                    preferences.writePreference(preference, next);
                }}
                options={options.map((id) => ({
                    label: translate(`preferences:theme-${id}`),
                    value: id,
                }))}
                value={theme}
            />
        </div>
    );
}
