import type { PropsWithChildren } from 'react';

type AddressEndProps = PropsWithChildren;

/**
 * The end of an `AddressBar`, inside its edge: what closes the address from within, such as the
 * state of a connection or a quiet icon that acts on the address. It belongs to the field, not
 * beside it, so the bar draws no seam before it.
 */
export function AddressEnd({ children }: AddressEndProps) {
    return (
        <span
            className="flex shrink-0 items-center gap-gap-tight px-pad-toggle"
            data-part="address-end"
        >
            {children}
        </span>
    );
}
