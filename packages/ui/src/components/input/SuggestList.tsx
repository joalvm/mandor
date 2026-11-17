import { Popover as PopoverPrimitive } from 'radix-ui';

export type SuggestOption = {
    /** What the field may show of the variable beyond its name: never the value of a secret. */
    hint?: string | undefined;
    /** The name the field receives when the option is picked. */
    name: string;
};

type SuggestListProps = {
    /** The name highlighted now; the keyboard stays with the field, the highlight follows it. */
    activeName: string | null;
    label: string;
    /** The pointer joined the keyboard: an option under it becomes the active one. */
    onHighlight?: ((name: string) => void) | undefined;
    onPick: (name: string) => void;
    options: readonly SuggestOption[];
    /** A registry long enough to scroll: the list stops at a few rows and moves inside. */
    scrollable?: boolean | undefined;
};

/**
 * The list of names a field suggests while a variable is being written. It hangs from the
 * field by way of the `Popover` that carries it, never takes the focus from the field, and
 * hands back a name: the field writes it, the list only points at it.
 */
export function SuggestList({
    activeName,
    label,
    onHighlight,
    onPick,
    options,
    scrollable = false,
}: SuggestListProps) {
    return (
        <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
                align="start"
                aria-label={label}
                className="z-dropdown min-w-48 rounded-lg border border-border-strong bg-surface-raised p-1 text-sm text-text-primary shadow-popover"
                onOpenAutoFocus={(event) => {
                    event.preventDefault();
                }}
                role="listbox"
                sideOffset={4}
            >
                <div className={scrollable ? 'max-h-60 overflow-y-auto' : undefined}>
                    {options.map((option) => {
                        const active = option.name === activeName;

                        return (
                            <div
                                aria-selected={active}
                                className="flex h-row cursor-default items-center gap-gap-control rounded-sm px-pad-control"
                                data-active={active ? 'true' : undefined}
                                data-part="suggest-option"
                                key={option.name}
                                onClick={() => {
                                    onPick(option.name);
                                }}
                                onPointerDown={(event) => {
                                    event.preventDefault();
                                }}
                                onPointerMove={
                                    onHighlight === undefined || active
                                        ? undefined
                                        : () => {
                                              onHighlight(option.name);
                                          }
                                }
                                role="option"
                                tabIndex={-1}
                            >
                                <span className="min-w-0 flex-1 truncate">{option.name}</span>
                                <SuggestHint hint={option.hint} />
                            </div>
                        );
                    })}
                </div>
            </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
    );
}

function SuggestHint({ hint }: { hint: string | undefined }) {
    if (hint === undefined) {
        return null;
    }

    return <span className="shrink-0 text-xs text-text-secondary">{hint}</span>;
}
