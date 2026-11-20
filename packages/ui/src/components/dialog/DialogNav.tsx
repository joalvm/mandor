import type { PropsWithChildren } from 'react';

type DialogNavProps = PropsWithChildren;

/**
 * The column of sections down the leading edge of a dialog, on the same ground as the rest of
 * it: a dialog is one surface, and the open section is what marks the column. It runs the full
 * height of the dialog, beside the title as well, so the sections read as the index of the
 * dialog and not as one more thing inside its body. It is as wide as the
 * column of sections of the settings tab, because it is the same column.
 *
 * Its first line stands level with the title, an offset `runtime.css` works out from the scale.
 * What it lists is written inside: a `DialogNavList` of sections or of things to pick from, and
 * under it, when there is one, the way to add one more.
 */
export function DialogNav({ children }: DialogNavProps) {
    return (
        <div
            className="flex min-h-0 w-settings-nav flex-col gap-gap-control overflow-hidden px-pad-control pb-pad-control"
            data-part="dialog-nav"
        >
            {children}
        </div>
    );
}
