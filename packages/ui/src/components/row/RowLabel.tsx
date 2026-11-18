import { cn } from '../../lib/cn.js';
import { useRowNameId } from './row-name.js';

type RowLabelProps = {
    children: string;
    /** Row state tinted at the source: an unsupported import row reads red here, not on a box. */
    className?: string | undefined;
};

/**
 * The name of a row: it takes what the row has left and cuts what does not fit.
 *
 * It carries the tooltip too, and that is why it exists as a component. The row is a box of
 * variable content; the truncation happens here, so the title that reveals the cut name belongs
 * here as well, and no caller has to remember to repeat the name in two places.
 *
 * Inside a row it also carries the id the row points at, which is how the row ends up named by
 * what it shows. Outside one there is no id to take, and it is only a name that fits.
 */
export function RowLabel({ children, className }: RowLabelProps) {
    const id = useRowNameId();

    return (
        <span
            className={cn('min-w-0 flex-1 truncate', className)}
            data-part="row-label"
            id={id}
            title={children}
        >
            {children}
        </span>
    );
}
