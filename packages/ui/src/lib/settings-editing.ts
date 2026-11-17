import type { SettingInheritance } from '../components/settings/SettingInheritanceLine.js';

/** What a holder keeps of its own over a group of defaults: any of them, or none. */
export type SettingOverrides<Values> = { [Key in keyof Values]?: Values[Key] | undefined };

/**
 * One way to edit a group of settings, whoever holds it: the values the rows show, the change
 * a row writes, and whose value each row reads. The defaults of an app and whatever overrides
 * them draw the same rows; only this changes.
 */
export type SettingsEditing<Values> = {
    change: (part: Partial<Values>) => void;
    /** Whose value the row reads, or nothing where the value is the row's own: the defaults. */
    inheritanceOf: (key: keyof Values) => SettingInheritance | undefined;
    values: Values;
};

/** What the line under a row says and does while it follows the defaults. */
export type SettingsInheritanceWords = {
    caption: string;
    onFollow: () => void;
    place: string;
    resetLabel: string;
};

type OverridesEditingInput<Values> = {
    defaults: Values;
    onOverrides: (overrides: SettingOverrides<Values>) => void;
    overrides: SettingOverrides<Values>;
    words: SettingsInheritanceWords;
};

/** Each setting of the group: the one kept over it when there is one, the default otherwise. */
export function settingsOver<Values extends object>(
    overrides: SettingOverrides<Values> | undefined,
    defaults: Values,
): Values {
    // What was kept comes from disk: a setting kept empty, or one the group no longer has, falls away.
    const kept = Object.entries(overrides ?? {}).filter(
        ([key, value]: [string, unknown]) =>
            Object.hasOwn(defaults, key) && value !== undefined && value !== null,
    );

    return { ...defaults, ...Object.fromEntries(kept) };
}

/** The same overrides without one of them: that setting follows the defaults again. */
export function withoutSetting<Values>(
    overrides: SettingOverrides<Values>,
    key: keyof Values,
): SettingOverrides<Values> {
    return Object.fromEntries(
        Object.entries(overrides).filter(([name, value]) => name !== key && value !== undefined),
    ) as SettingOverrides<Values>;
}

/**
 * A holder over the defaults: each row shows what would be used, a change is kept by the holder
 * alone, and the row that keeps one hands it back from the same line.
 */
export function overridesEditing<Values extends object>({
    defaults,
    onOverrides,
    overrides,
    words,
}: OverridesEditingInput<Values>): SettingsEditing<Values> {
    return {
        change: (part) => {
            onOverrides({ ...overrides, ...part });
        },
        inheritanceOf: (key) => ({
            caption: words.caption,
            onFollow: words.onFollow,
            place: words.place,
            reset:
                overrides[key] === undefined
                    ? undefined
                    : {
                          label: words.resetLabel,
                          onReset: () => {
                              onOverrides(withoutSetting(overrides, key));
                          },
                      },
        }),
        values: settingsOver(overrides, defaults),
    };
}

/** The defaults themselves: what they hold is theirs, and nothing above them. */
export function defaultsEditing<Values>(
    defaults: Values,
    onDefaults: (defaults: Values) => void,
): SettingsEditing<Values> {
    return {
        change: (part) => {
            onDefaults({ ...defaults, ...part });
        },
        inheritanceOf: () => undefined,
        values: defaults,
    };
}
