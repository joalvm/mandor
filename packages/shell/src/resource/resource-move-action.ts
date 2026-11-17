import { resourceMoved, type Layout } from '../grid/grid-changes.js';
import { announceResourceMove } from './resource-move-registry.js';

/**
 * What a rename on disk does to the window: the tabs follow the file, none of them close, and
 * whoever else filed something under the old name hears about it so it can follow too.
 *
 * The two halves are one action because the window must never do the first without the second:
 * a tab left pointing at the new name while a panel still holds the old one is the composer
 * hanging its trail from a file that is no longer there.
 */
export function moveResourceFor(
    relaid: (change: (layout: Layout) => Layout) => void,
): (from: string, to: string) => void {
    return (from, to) => {
        relaid((layout) => resourceMoved(layout, from, to));
        announceResourceMove(from, to);
    };
}
