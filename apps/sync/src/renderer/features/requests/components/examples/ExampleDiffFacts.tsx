import { useMessages } from '@mandor/i18n';
import { Table, TableHead, TableHeaderCell, type TableColumn } from '@mandor/ui';

import type { FactDifference } from '../../lib/compare/compare-facts.js';

const COLUMNS: readonly TableColumn[] = [
    { id: 'name', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'expected', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'received', kind: 'fluid', min: 'md', weight: 1 },
];

/** The word each kind of fact wears, since one table holds both. */
const KIND_LABEL = {
    cookie: 'exampleFactCookie',
    header: 'exampleFactHeader',
} as const satisfies Record<FactDifference['kind'], string>;

type ExampleDiffFactsProps = {
    facts: readonly FactDifference[];
};

/**
 * The headers and cookies the example declared that came otherwise, or did not come. They sit
 * over the lines of the body, which they are no part of; with none, the body is all there is.
 */
export function ExampleDiffFacts({ facts }: ExampleDiffFactsProps) {
    const labels = useMessages('requests');

    if (facts.length === 0) {
        return null;
    }

    return (
        <div
            className="max-h-48 shrink-0 overflow-auto px-pad-panel"
            data-part="example-diff-facts"
        >
            <Table columns={COLUMNS} label={labels('exampleFacts')} rowHover={false}>
                <TableHead>
                    <TableHeaderCell column="name">{labels('columnName')}</TableHeaderCell>
                    <TableHeaderCell column="expected">
                        {labels('exampleFactExpected')}
                    </TableHeaderCell>
                    <TableHeaderCell column="received">
                        {labels('exampleFactReceived')}
                    </TableHeaderCell>
                </TableHead>
                <tbody>
                    {facts.map((fact) => (
                        <tr key={`${fact.kind}:${fact.name}`}>
                            <td>
                                <span className="text-text-tertiary">
                                    {labels(KIND_LABEL[fact.kind])}
                                </span>{' '}
                                {fact.name}
                            </td>
                            <td>{fact.expected}</td>
                            <td>{fact.received ?? '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </div>
    );
}
