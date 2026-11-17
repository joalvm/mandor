import { Popover as PopoverPrimitive } from 'radix-ui';
import type { PropsWithChildren, RefObject } from 'react';

/** Where a panel hangs when no node owns the spot: a rect, measured where it opened. */
export type PopoverAnchor = { getBoundingClientRect: () => DOMRect };

type PopoverProps = PropsWithChildren<{
    /** A rect to hang from, for panels that open over a spot inside a field or an editor. */
    anchor?: RefObject<PopoverAnchor | null> | undefined;
    /**
     * A modal panel takes the focus and the tab order while it is open. The panels a field
     * opens while the pointer passes — a hover, a list of suggestions — must leave both where
     * they were: the field is still being typed into.
     */
    modal?: boolean | undefined;
    onOpenChange?: ((open: boolean) => void) | undefined;
    open?: boolean | undefined;
}>;

/**
 * A short anchored form, opened from a control and returning focus to it when it closes.
 *
 * The control and the panel are both written inside, as siblings, because they are two places
 * and not two values: handing either of them in as a prop would hide half the tree behind a
 * name and leave the caller unable to say what goes where.
 */
export function Popover({ anchor, children, modal = true, onOpenChange, open }: PopoverProps) {
    return (
        <PopoverPrimitive.Root
            modal={modal}
            {...(onOpenChange === undefined ? {} : { onOpenChange })}
            {...(open === undefined ? {} : { open })}
        >
            <PopoverAnchorSpot anchor={anchor} />
            {children}
        </PopoverPrimitive.Root>
    );
}

function PopoverAnchorSpot({ anchor }: { anchor: PopoverProps['anchor'] }) {
    if (anchor?.current === undefined || anchor.current === null) {
        return null;
    }

    return <PopoverPrimitive.Anchor virtualRef={anchor} />;
}
