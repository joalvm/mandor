import { useMessages } from '@mandor/i18n';
import type { ConflictChoice, ConflictItem } from '@mandor/ipc';
import { Checkbox, Table, TableHead, TableHeaderCell, type TableColumn } from '@mandor/ui';

import { pickOf, type ConflictChoices } from '../../lib/conflict-drafts.js';
import { sideState } from '../../lib/conflict-sections.js';
import { LineList } from './LineList.js';
import { ResultList } from './ResultList.js';

type ConflictCompareProps = {
    choices: ConflictChoices;
    items: readonly ConflictItem[];
    /** What the step is called: the table is named after it. */
    label: string;
    onChoose: (itemId: string, choice: ConflictChoice) => void;
    /** Takes an answer back, so the question waits again. */
    onClear: (itemId: string) => void;
};

const COLUMNS: readonly TableColumn[] = [
    { id: 'ours', kind: 'fluid', min: 'md', weight: 1 },
    { id: 'theirs', kind: 'fluid', min: 'md', weight: 1 },
];

/** A cell that holds lines of its own: they reach its edges and bring their own air. */
const PANE = 'flex-col items-stretch p-0';

/**
 * A step laid out as a table of two rows. Above, the two copies side by side, each line with a
 * box and each side with one that takes all of it at once; below, across both columns, the
 * result, which shows only what was ticked. A line is taken from one side or the other, so
 * ticking it on one side unticks it on the other. Colour belongs to the lines, not to the heads.
 */
export function ConflictCompare({
    choices,
    items,
    label,
    onChoose,
    onClear,
}: ConflictCompareProps) {
    const messages = useMessages('conflicts');
    const toggle = (side: 'ours' | 'theirs') => (item: ConflictItem, on: boolean) => {
        if (on) {
            onChoose(item.id, { pick: side });

            return;
        }

        if (pickOf(choices[item.id]) === side) {
            onClear(item.id);
        }
    };

    const heads = [
        { all: messages('allOurs'), side: 'ours', title: messages('ours') },
        { all: messages('allTheirs'), side: 'theirs', title: messages('theirs') },
    ] as const;

    return (
        <Table columns={COLUMNS} label={label}>
            <TableHead>
                {heads.map(({ all, side, title }) => (
                    <TableHeaderCell column={side} key={side}>
                        <span className="flex items-center gap-gap-control">
                            <Checkbox
                                checked={sideState(items, choices, side)}
                                label={all}
                                onCheckedChange={(on) => {
                                    items.forEach((item) => {
                                        toggle(side)(item, on);
                                    });
                                }}
                            />
                            {title}
                        </span>
                    </TableHeaderCell>
                ))}
            </TableHead>
            <tbody data-part="conflict-compare">
                {/* The panes are not a line to point at: the pointer tints the lines inside. */}
                <tr className="bg-transparent">
                    {heads.map(({ side }) => (
                        <td className={PANE} key={side}>
                            <LineList
                                choices={choices}
                                items={items}
                                onToggle={toggle(side)}
                                side={side}
                            />
                        </td>
                    ))}
                </tr>
                <tr className="bg-transparent">
                    <th className="text-xs text-text-secondary" colSpan={2} scope="colgroup">
                        {messages('textResult')}
                    </th>
                </tr>
                <tr className="bg-transparent">
                    <td className={PANE} colSpan={2}>
                        <ResultList choices={choices} items={items} />
                    </td>
                </tr>
            </tbody>
        </Table>
    );
}
