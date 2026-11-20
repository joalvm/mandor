import { Tabs as TabsPrimitive } from 'radix-ui';
import type { PropsWithChildren } from 'react';

/** The children are what the section says at its end, after its name and count: a figure of its own, a spinner. */
type TabsTabProps = PropsWithChildren<{
    /** The section holds something that is wrong, like a value that breaks its schema. */
    broken?: boolean | undefined;
    /** How many entries the section holds: the strip says it without opening the section. */
    count?: number | undefined;
    /** The section holds changes that were neither sent nor saved yet. */
    dirty?: boolean | undefined;
    /** The section has something in it that has no count to show, like a body or an auth. */
    filled?: boolean | undefined;
    label: string;
    value: string;
}>;

/**
 * A section carries no shape of its own: no fill, no border, no line under the strip. What
 * fills is the state — pointed at, or open — and `runtime.css` says which fill goes with which,
 * where one selector can say it for every strip of the window at once.
 *
 * It is cut like the tabs of the window it sits inside: the same height, the same rounding, the
 * same air on both sides of what it says, and a width that is the name's. A floor under that
 * width would put air around short names and leave the strip looking padded at random.
 */
const TAB =
    'relative flex h-tab max-w-60 shrink-0 cursor-pointer items-center gap-gap-icon-text rounded-md border border-transparent px-pad-control text-sm transition-colors duration-fast';

/**
 * One section of the strip. After the name comes what the section has to say and nothing more —
 * a section is not closed from the strip. A count follows the name; one dot follows it too: the
 * dot of something wrong, the dot of unsent work, or the quiet dot of a section with content but
 * nothing to count, in that priority: what is wrong matters more than what is unsent, and that
 * more than what is there. The dot only points: what is wrong is told inside the section. A
 * section with nothing to say keeps no room for it, so the strip spends its width on names.
 */
export function TabsTab({ broken, children, count, dirty, filled, label, value }: TabsTabProps) {
    return (
        <TabsPrimitive.Trigger
            className={TAB}
            data-broken={broken === true ? '' : undefined}
            data-count={count === undefined || count === 0 ? undefined : String(count)}
            data-dirty={dirty === true ? '' : undefined}
            data-focus-frame=""
            data-label={label}
            data-part="tabs-trigger"
            data-value={value}
            value={value}
        >
            <span className="min-w-0" data-fade-overflow="">
                {label}
            </span>
            <TabCount count={count} />
            <TabMark broken={broken} dirty={dirty} filled={filled} />
            <TabEnd>{children}</TabEnd>
        </TabsPrimitive.Trigger>
    );
}

/** The mark a section brings of its own, kept in a slot so the strip can find it. */
function TabEnd({ children }: Pick<TabsTabProps, 'children'>) {
    if (children === undefined || children === null || children === false) {
        return null;
    }

    return (
        <span className="flex shrink-0 items-center" data-part="tabs-tab-mark">
            {children}
        </span>
    );
}

function TabCount({ count }: { count: TabsTabProps['count'] }) {
    if (count === undefined || count === 0) {
        return null;
    }

    return (
        <span className="text-xs tabular-nums text-text-secondary" data-part="tabs-count">
            {count}
        </span>
    );
}

/** The dot of something wrong wins over that of unsent work, and both over the quiet one. */
function TabMark({ broken, dirty, filled }: Pick<TabsTabProps, 'broken' | 'dirty' | 'filled'>) {
    if (broken === true) {
        return <TabDot part="tabs-broken" tone="bg-solid-warning" />;
    }

    if (dirty === true) {
        return <TabDot part="tabs-dirty" tone="bg-text-accent" />;
    }

    if (filled !== true) {
        return null;
    }

    return <TabDot part="tabs-filled" tone="bg-solid-success" />;
}

function TabDot({ part, tone }: { part: string; tone: string }) {
    return (
        <span
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center"
            data-part="tabs-mark"
        >
            <span className={`size-1.5 rounded-full ${tone}`} data-part={part} />
        </span>
    );
}
