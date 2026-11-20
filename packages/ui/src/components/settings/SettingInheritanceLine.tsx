import { RefreshIcon } from '@mandor/icons';

/** Where a setting takes its value from while it keeps none of its own. */
export type SettingInheritance = {
    /** What the line says before the place: «Por defecto:». */
    caption: string;
    onFollow: () => void;
    /** The place that holds the default, and the way to it: «Ajustes». */
    place: string;
    /** Present while the row keeps a value of its own: the act that hands it back. */
    reset?: { label: string; onReset: () => void } | undefined;
};

type SettingInheritanceLineProps = {
    inheritance: SettingInheritance;
};

const LINK =
    'cursor-pointer rounded-sm border border-transparent text-text-secondary underline underline-offset-2 hover:text-text-primary';

/**
 * The line under a control that says whose value it shows. While it follows the default it
 * names the place that holds it, and the name leads there; once the row keeps its own, the
 * same spot hands it back. The two never show at once: a row reads one value.
 */
export function SettingInheritanceLine({ inheritance }: SettingInheritanceLineProps) {
    const { caption, onFollow, place, reset } = inheritance;

    if (reset !== undefined) {
        return (
            <button
                className="inline-flex cursor-pointer items-center gap-gap-icon-text rounded-sm border border-transparent text-xs text-text-secondary hover:text-text-primary"
                data-focus-frame=""
                data-part="setting-reset"
                onClick={reset.onReset}
                type="button"
            >
                <RefreshIcon size="sm" />
                {reset.label}
            </button>
        );
    }

    return (
        <span
            className="inline-flex items-center gap-gap-tight text-xs text-text-tertiary"
            data-part="setting-inherited"
        >
            {caption}
            <button className={LINK} data-focus-frame="" onClick={onFollow} type="button">
                {place}
            </button>
        </span>
    );
}
