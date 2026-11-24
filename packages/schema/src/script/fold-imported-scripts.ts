import { z } from 'zod';

import { ownScriptsOrNothing, REQUEST_SCRIPT_EVENTS, type RequestScripts } from './own-scripts.js';

/**
 * The scripts of another app as an older Mandor kept them, beside the own ones and apart from
 * them: one per moment, as text that never ran. Only the fold reads this shape now; the schema of
 * every file has forgotten it.
 */
const importedScriptsSchema = z.array(
    z.object({ event: z.enum(REQUEST_SCRIPT_EVENTS), source: z.string() }),
);

/** Where the imported text goes: behind the own one, or before it. */
export type FoldPlace = 'after' | 'before';

const GAP = '\n\n';

/** The own text and the imported one, in the order each place puts them. */
const ORDER_OF: Record<FoldPlace, (own: string, imported: string) => string[]> = {
    after: (own, imported) => [own, imported],
    before: (own, imported) => [imported, own],
};

/**
 * The own scripts of a level with the imported scripts of the same moment in them, a blank line
 * between the two texts. The imported text goes behind the own one, or before it when it ran
 * ahead of everything the level holds. An own script keeps its switch; a moment that had none
 * gets a script of its own. A list that is not the old shape folds nothing.
 */
export function foldImportedScripts(
    own: RequestScripts | undefined,
    imported: unknown,
    place: FoldPlace = 'after',
): RequestScripts | undefined {
    const parsed = importedScriptsSchema.safeParse(imported);

    if (!parsed.success) {
        return ownScriptsOrNothing(own);
    }

    const folded: RequestScripts = { ...own };

    for (const { event, source } of parsed.data) {
        const entry = folded[event];
        const texts = ORDER_OF[place](entry?.source ?? '', source).filter((text) => text !== '');

        folded[event] = { ...entry, source: texts.join(GAP) };
    }

    return ownScriptsOrNothing(folded);
}
