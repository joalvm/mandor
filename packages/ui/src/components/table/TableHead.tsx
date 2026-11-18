import type { PropsWithChildren } from 'react';

/**
 * The head of a table: one row of `TableHeaderCell`, and the `TableTools` last. It stays in
 * sight while the rows scroll under it, and its names speak quieter than the rows they name.
 */
export function TableHead({ children }: PropsWithChildren) {
    return (
        <thead className="text-xs text-text-secondary" data-part="table-head">
            <tr>{children}</tr>
        </thead>
    );
}
