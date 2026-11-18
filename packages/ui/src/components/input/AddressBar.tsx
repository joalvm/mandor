import { Children, Fragment, isValidElement, type PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { AddressActions } from './AddressActions.js';

type AddressBarProps = PropsWithChildren<{
    className?: string | undefined;
}>;

/**
 * One control made of several: what a target is dialed with — a method, an environment, a
 * namespace — and the address itself, fused into a single box the way an address bar is.
 *
 * The bar owns the edge, the surface and the focus: whichever part holds the focus recolors the
 * one line around all of them, so the parts inside draw no box of their own (a field goes in
 * `bare`, a picker as a ghost button without edge). Between two parts it draws a seam, a short
 * line that splits them without closing either; a part that renders nothing leaves no seam, and
 * the `AddressActions` at the end get none: they act on the address, they are not a part of it.
 */
export function AddressBar({ children, className }: AddressBarProps) {
    const parts = Children.toArray(children);

    return (
        // band-policy: fused-control — the parts carry their own inset; the bar only joins them.
        <div
            className={cn(
                'flex h-control min-w-0 items-center rounded-md border border-border-strong bg-surface-sunken',
                'transition-colors duration-fast hover:border-border-hover',
                className,
            )}
            data-focus-frame=""
            data-part="address-bar"
        >
            {parts.map((part, index) => (
                <Fragment key={index}>
                    <AddressSeam
                        visible={
                            index > 0 && !(isValidElement(part) && part.type === AddressActions)
                        }
                    />
                    {part}
                </Fragment>
            ))}
        </div>
    );
}

function AddressSeam({ visible }: { visible: boolean }) {
    if (!visible) {
        return null;
    }

    return (
        <span
            aria-hidden="true"
            className="h-control-xs w-px shrink-0 bg-border-strong"
            data-part="address-bar-seam"
        />
    );
}
