import type { PropsWithChildren } from 'react';

type AddressActionsProps = PropsWithChildren;

/**
 * The quiet actions at the end of an `AddressBar`, inside its edge: icon buttons that act on the
 * address itself, such as showing it as code. They belong to the field, not beside it, so the bar
 * draws no seam before them.
 */
export function AddressActions({ children }: AddressActionsProps) {
    return (
        <span
            className="flex shrink-0 items-center gap-gap-tight px-pad-toggle"
            data-part="address-actions"
        >
            {children}
        </span>
    );
}
