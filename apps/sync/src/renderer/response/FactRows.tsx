type FactRowsProps = {
    /** A row without a value is one the send could not see: it is left out, never drawn blank. */
    rows: readonly (readonly [label: string, value: string | undefined])[];
};

/** Name and value lines of a detail panel, the names in one column and the values aligned right. */
export function FactRows({ rows }: FactRowsProps) {
    const seen = rows.filter((row): row is readonly [string, string] => row[1] !== undefined);

    return (
        <dl className="flex flex-col gap-gap-tight text-xs" data-part="fact-rows">
            {seen.map(([label, value]) => (
                <div className="flex min-w-0 items-baseline gap-gap-control" key={label}>
                    <dt className="shrink-0 text-text-secondary">{label}</dt>
                    <dd className="ms-auto min-w-0 truncate text-end tabular-nums text-text-primary">
                        {value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
