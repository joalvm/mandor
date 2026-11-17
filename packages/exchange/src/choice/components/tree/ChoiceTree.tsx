import { useMessages } from '@mandor/i18n';
import { Tree } from '@mandor/ui';
import { useState, type PropsWithChildren } from 'react';

import {
    choiceLines,
    filterNodes,
    foldableIds,
    foldedAfter,
    foldedByDefault,
} from '../../lib/choice-lines.js';
import { countOf, stateOf, toggle, type ChoiceNode } from '../../lib/choice-state.js';
import { ChoiceTreeRow } from './ChoiceTreeRow.js';
import { ChoiceTreeToolbar } from './ChoiceTreeToolbar.js';

type ChoiceTreeProps = PropsWithChildren<{
    chosen: ReadonlySet<string>;
    /** What the tree is called to a reader of the screen. */
    label: string;
    /** Something is being read: the tree is not there yet, and the panel says so. */
    loading?: boolean | undefined;
    nodes: readonly ChoiceNode[];
    onChange: (chosen: Set<string>) => void;
    /** The name of the top line, which holds every node: the workspace, or «everything». */
    title: string;
}>;

/** What a filter shows: every branch open, so a match is never behind a fold. */
const OPEN: ReadonlySet<string> = new Set();

/**
 * A tree to choose from, with a checkbox on every node and the whole of it on top. A branch is
 * checked, unchecked or mixed by what it holds, and one press on its box marks or clears the whole
 * branch. A press on a branch folds it, as in the lateral; space marks it. A press on a leaf
 * marks it. The chevron of every branch is drawn, and the line above the tree filters it and
 * folds it all at once. The panel keeps one height whatever is folded or filtered.
 *
 * It owns what is folded and what is typed in the filter, and nothing of the choice: the set of
 * chosen ids is the caller's, handed back whole at every change. Until the user folds something,
 * the folds are the ones the nodes ask for; a caller that hands it other nodes to start over uses
 * a new `key`.
 */
export function ChoiceTree({
    children,
    chosen,
    label,
    loading = false,
    nodes,
    onChange,
    title,
}: ChoiceTreeProps) {
    const [needle, setNeedle] = useState('');
    const [touched, setTouched] = useState<ReadonlySet<string> | null>(null);
    const folded = touched ?? foldedByDefault(nodes);
    const foldable = foldableIds(nodes);
    const allFolded = foldable.length > 0 && foldable.every((id) => folded.has(id));
    const shown = filterNodes(nodes, needle);
    // With nothing left to choose, the top line is a leaf: barred, so a press chooses no phantom.
    const everything: ChoiceNode = {
        children: shown,
        icon: null,
        id: '',
        label: title,
        reason: shown.length === 0 ? '' : undefined,
    };
    const lines = choiceLines([everything], needle.trim() === '' ? folded : OPEN);

    // A node with nothing to choose says nothing, whether a box or the row itself was pressed.
    const choose = (node: ChoiceNode): void => {
        if (countOf(node, chosen).total > 0) {
            onChange(toggle(chosen, node));
        }
    };

    return (
        <div className="flex min-h-0 flex-col gap-gap-group" data-part="choice-tree">
            <ChoiceTreeToolbar
                allFolded={allFolded}
                foldable={foldable.length > 0}
                needle={needle}
                onFoldAll={() => {
                    setTouched(allFolded ? new Set() : new Set(foldable));
                }}
                onNeedleChange={setNeedle}
            >
                {children}
            </ChoiceTreeToolbar>
            <div
                className="box-content flex h-96 flex-col rounded-md border border-border-subtle bg-surface-panel p-2"
                data-part="choice-tree-viewport"
            >
                <ChoiceTreeBody
                    chosen={chosen}
                    folded={folded}
                    label={label}
                    lines={lines}
                    loading={loading}
                    onChoose={choose}
                    onFold={setTouched}
                />
            </div>
        </div>
    );
}

function ChoiceTreeBody({
    chosen,
    folded,
    label,
    lines,
    loading,
    onChoose,
    onFold,
}: {
    chosen: ChoiceTreeProps['chosen'];
    folded: ReadonlySet<string>;
    label: ChoiceTreeProps['label'];
    lines: ReturnType<typeof choiceLines>;
    loading: boolean;
    onChoose: (node: ChoiceNode) => void;
    onFold: (folded: Set<string>) => void;
}) {
    const messages = useMessages('choice');

    if (loading) {
        return <span className="m-auto text-xs text-text-secondary">{messages('loading')}</span>;
    }

    return (
        <Tree
            chevrons
            label={label}
            lines={lines}
            onActivate={(id, activation) => {
                const line = lines.find((one) => one.id === id);

                if (line === undefined) {
                    return;
                }

                if (line.expanded === undefined || activation.space === true) {
                    onChoose(line.node);

                    return;
                }

                onFold(foldedAfter(folded, id, !line.expanded));
            }}
            onExpandedChange={(id, expanded) => {
                onFold(foldedAfter(folded, id, expanded));
            }}
        >
            {lines.map(({ id, node }) => (
                <ChoiceTreeRow
                    key={id}
                    node={node}
                    onToggle={() => {
                        onChoose(node);
                    }}
                    state={stateOf(node, chosen)}
                />
            ))}
        </Tree>
    );
}
