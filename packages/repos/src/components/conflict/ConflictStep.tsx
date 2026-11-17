import type { ConflictChoice, ConflictItem } from '@mandor/ipc';

import { itemName } from '../../lib/conflict-sections.js';
import type { ConflictChoices } from '../../lib/conflict-drafts.js';
import { ConflictCompare } from './ConflictCompare.js';
import { TextChoice } from './TextChoice.js';

type ConflictStepProps = {
    choices: ConflictChoices;
    items: readonly ConflictItem[];
    onChoose: (itemId: string, choice: ConflictChoice) => void;
    onClear: (itemId: string) => void;
    /** What the part is called: «URL», «Headers», «Body». */
    title: string;
};

/**
 * One part of the entity that clashed, drawn by the shape of its questions: lines of a value, a
 * list or a file go in the table of two copies and a result; a text both copies rewrote keeps
 * the editor of differences, where whole lines cannot be told apart by a box.
 */
export function ConflictStep({ choices, items, onChoose, onClear, title }: ConflictStepProps) {
    const texts = items.filter((item) => item.shape === 'text');
    const lines = items.filter((item) => item.shape !== 'text');

    return (
        <div className="flex min-w-0 flex-col gap-gap-section" data-part="conflict-step">
            <ConflictLines
                choices={choices}
                items={lines}
                onChoose={onChoose}
                onClear={onClear}
                title={title}
            />
            {texts.map((item) => (
                <div data-item-id={item.id} data-part="conflict-point" key={item.id}>
                    <TextChoice
                        choice={choices[item.id]}
                        item={item}
                        label={itemName(item) || title}
                        onChoose={onChoose}
                    />
                </div>
            ))}
        </div>
    );
}

function ConflictLines({ choices, items, onChoose, onClear, title }: ConflictStepProps) {
    if (items.length === 0) {
        return null;
    }

    return (
        <ConflictCompare
            choices={choices}
            items={items}
            label={title}
            onChoose={onChoose}
            onClear={onClear}
        />
    );
}
