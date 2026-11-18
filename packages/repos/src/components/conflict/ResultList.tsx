import { useMessages } from '@mandor/i18n';
import type { ConflictItem } from '@mandor/ipc';

import { pickOf, type ConflictChoices } from '../../lib/conflict-drafts.js';
import { itemName } from '../../lib/conflict-sections.js';
import { ConflictLine } from './ConflictLine.js';

type ResultListProps = {
    choices: ConflictChoices;
    items: readonly ConflictItem[];
};

/**
 * What the answers write down, and only that: the lines that were ticked, each in the colour of
 * the side it came from. Nothing ticked yet says how to start instead of showing an empty box.
 */
export function ResultList({ choices, items }: ResultListProps) {
    const messages = useMessages('conflicts');
    const lines = items.flatMap((item) => {
        const side = pickOf(choices[item.id]);

        return side === null ? [] : [{ item, side }];
    });

    if (lines.length === 0) {
        return (
            <p className="px-pad-control py-2 text-sm text-text-secondary" data-part="result-empty">
                {messages('resultEmpty')}
            </p>
        );
    }

    return (
        <ul className="flex flex-col py-1" data-part="result-list">
            {lines.map(({ item, side }) => (
                <ConflictLine key={item.id} name={itemName(item)} side={item[side]} tone={side} />
            ))}
        </ul>
    );
}
