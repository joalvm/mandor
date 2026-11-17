import { KeyValueTable, type KeyValueColumns } from '@mandor/env';

import { useExpectedLines } from '../../hooks/useExpectedLines.js';
import type { ExpectedPair } from '../../lib/expected-lines.js';

const COLUMNS: KeyValueColumns = { description: false, value: true };

type ExampleExpectedTableProps = {
    onWrite: (pairs: readonly ExpectedPair[]) => void;
    pairs: readonly ExpectedPair[];
    /** What the table is a table of. */
    title: string;
};

/**
 * What an example declares of its answer, written by hand as any list of pairs: a line added is a
 * promise the comparison will check, a line deleted one it stops checking. Nothing here goes out,
 * so no line carries the switch that sends it, and its values are literal: no variable resolves
 * against an answer.
 */
export function ExampleExpectedTable({ onWrite, pairs, title }: ExampleExpectedTableProps) {
    const { lines, onLinesChange } = useExpectedLines(pairs, onWrite);

    return (
        <div
            className="grid h-full min-h-0 min-w-0 content-start gap-gap-group p-pad-panel"
            data-part="example-expected"
        >
            <KeyValueTable
                bulkEdit={false}
                checkable={false}
                columnMenu={false}
                columns={COLUMNS}
                environment={undefined}
                lines={lines}
                onColumnsChange={() => undefined}
                onLinesChange={onLinesChange}
                onVariablesChange={() => undefined}
                title={title}
                typed={false}
                variables={false}
            />
        </div>
    );
}
