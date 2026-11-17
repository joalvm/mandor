import { KeyValueTable, keyValueLinesOf, requestLinesOf, type KeyValueColumns } from '@mandor/env';
import type { Environment, RequestLine, Variable } from '@mandor/schema';
import { useState } from 'react';

type RequestPairsProps = {
    environment: Environment | undefined;
    lines: RequestLine[];
    onChange: (lines: RequestLine[]) => void;
    /** The variables the pairs name and nobody declared, handed over to be declared. */
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** What the table is a table of. */
    title: string;
};

/** The columns a table of pairs opens with; the reader may take one away for a while. */
const OPENING_COLUMNS: KeyValueColumns = { description: true, value: true };

/**
 * A list of pairs of the request as one table — its query, its path params, the fields of an
 * urlencoded body: key, value and what each pair is for, with the type a pair promises under
 * the popover of its row. Which columns are on screen is reading state,
 * so it never reaches the file; the rows do, through the same patch every edit of the panel
 * travels by.
 */
export function RequestPairs({
    environment,
    lines,
    onChange,
    onVariablesChange,
    title,
}: RequestPairsProps) {
    const [columns, setColumns] = useState<KeyValueColumns>(OPENING_COLUMNS);

    return (
        <KeyValueTable
            columns={columns}
            environment={environment}
            lines={keyValueLinesOf(lines)}
            onColumnsChange={setColumns}
            onLinesChange={(next) => {
                onChange(requestLinesOf(next, lines));
            }}
            onVariablesChange={onVariablesChange}
            title={title}
            typed
        />
    );
}
