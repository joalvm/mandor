import { Icon, InfoIcon } from '@mandor/icons';
import { Checkbox, MethodMark, RowLabel, Tooltip, TreeRow } from '@mandor/ui';
import type { ChoiceNode, ChoiceState } from '../../lib/choice-state.js';

type ChoiceTreeRowProps = {
    node: ChoiceNode;
    onToggle: () => void;
    state: ChoiceState;
};

const CHECKED = {
    checked: true,
    mixed: 'indeterminate',
    unchecked: false,
} as const satisfies Record<ChoiceState, boolean | 'indeterminate'>;

/**
 * One node of a choice, drawn as a line of the tree it sits in: the checkbox, the verb or the
 * glyph, and the name. A node that can never be chosen keeps its line, without a box, and says
 * why in a tooltip: the warning goes where the choice is made. A node that loses something on
 * the way in stays open to the choice and says so in the same place, with a quiet glyph.
 *
 * Folding, and choosing with the keyboard or a press on a leaf, are the tree's. The checkbox is
 * the same choice under the pointer, and stays out of the tab order: the row is where the
 * tabulator lands, and a stop inside every row would walk the whole tree one box at a time.
 */
export function ChoiceTreeRow({ node, onToggle, state }: ChoiceTreeRowProps) {
    const barred = node.reason !== undefined;
    // What a tooltip says of the node: why it is barred, or else what it loses on the way in.
    const words = node.reason ?? node.note ?? '';

    return (
        <TreeRow>
            <Checkbox
                checked={CHECKED[state]}
                disabled={barred}
                label={node.label}
                onCheckedChange={onToggle}
                onClick={(event) => {
                    event.stopPropagation();
                }}
            />
            <ChoiceGlyph node={node} />
            <ChoiceTreeName barred={barred} node={node} words={words} />
        </TreeRow>
    );
}

/**
 * What says what the node is: the verb of a request, in a slot as wide for every row so the
 * names stay in one column, or the glyph of its kind.
 */
function ChoiceGlyph({ node }: { node: ChoiceNode }) {
    if (node.mark !== undefined) {
        return (
            <span className="flex w-10 shrink-0 items-center justify-end">
                <MethodMark compact method={node.mark} />
            </span>
        );
    }

    if (node.icon === null) {
        return null;
    }

    return <Icon name={node.icon} size="sm" />;
}

function ChoiceTreeName({
    barred,
    node,
    words,
}: {
    barred: boolean;
    node: ChoiceTreeRowProps['node'];
    words: string;
}) {
    const label = (
        <RowLabel className={barred && words !== '' ? 'text-text-error' : undefined}>
            {node.label}
        </RowLabel>
    );

    if (words === '') {
        return label;
    }

    return (
        <Tooltip content={words}>
            <span className="flex min-w-0 flex-1 items-center gap-gap-control">
                {label}
                <ChoiceNote barred={barred} />
            </span>
        </Tooltip>
    );
}

function ChoiceNote({ barred }: { barred: boolean }) {
    if (barred) {
        return null;
    }

    return (
        <span className="shrink-0 text-text-secondary" data-part="row-note">
            <InfoIcon size="sm" />
        </span>
    );
}
