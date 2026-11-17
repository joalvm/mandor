import { useMessages } from '@mandor/i18n';
import type { ConflictItem } from '@mandor/ipc';

import { pickOf, type ConflictChoices } from '../../lib/conflict-drafts.js';
import { itemName } from '../../lib/conflict-sections.js';
import { ConflictLine } from './ConflictLine.js';

/** What the box of a line says it takes, by the side it sits on. */
const PICK_LABEL_OF_SIDE = { ours: 'pickOurs', theirs: 'pickTheirs' } as const;

type LineListProps = {
    choices: ConflictChoices;
    items: readonly ConflictItem[];
    /** A line was ticked or unticked on this side. */
    onToggle: (item: ConflictItem, on: boolean) => void;
    side: 'ours' | 'theirs';
};

/** The lines one side has for the questions of a step, each with the box that takes it. */
export function LineList({ choices, items, onToggle, side }: LineListProps) {
    const messages = useMessages('conflicts');

    return (
        <ul className="flex flex-col py-1" data-part="line-list" data-side={side}>
            {items.map((item) => (
                <ConflictLine
                    checked={pickOf(choices[item.id]) === side}
                    key={item.id}
                    label={messages(PICK_LABEL_OF_SIDE[side], {
                        name: itemName(item),
                    })}
                    name={itemName(item)}
                    onCheckedChange={(on) => {
                        onToggle(item, on);
                    }}
                    side={item[side]}
                    tone={side}
                />
            ))}
        </ul>
    );
}
