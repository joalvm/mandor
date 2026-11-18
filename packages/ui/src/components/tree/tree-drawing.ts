import type { TreeLine } from './tree-line.js';
import type { TreeLineScope } from './tree-scope.js';
import type { TreeCommands } from './useTreeCommands.js';
import type { TreeFocus } from './useTreeFocus.js';

/** What the tree holds while it draws its lines: the same for every line of one drawing. */
export type TreeDrawing = {
    chevrons: boolean;
    commands: TreeCommands;
    focus: TreeFocus;
    lines: readonly TreeLine[];
    selected: ReadonlySet<string> | undefined;
    tabStop: number;
};

/** The scope one line of the drawing reads: where it sits, its state, and whom it tells. */
export function lineScopeOf(drawing: TreeDrawing, index: number): TreeLineScope {
    const { chevrons, commands, focus, lines, selected } = drawing;
    const line = lines[index] ?? { id: '', level: 1 };

    return {
        chevrons,
        claimsFocus: focus.pending && focus.id === line.id,
        expanded: line.expanded,
        level: line.level,
        onClaimed: focus.claimed,
        onFocus: () => {
            focus.take(line.id);
        },
        onKeyDown: (event) => {
            commands.keyDown(event, index);
        },
        onPress: (activation) => {
            commands.press(index, activation);
        },
        onToggle: () => {
            commands.toggle(index);
        },
        selected: selected?.has(line.id),
        tabStop: index === drawing.tabStop,
    };
}
