import type { Translator } from '@mandor/i18n';
import type { ResourceUri } from '@mandor/schema';

/** The field of an entry the query matched, so the result can say why it is there. */
export type SearchField = 'content' | 'name' | 'tag' | 'trail';

/** What a hit is. The search matches envelopes, so it never learns what a message is. */
type SearchSource = 'doc' | 'environment' | 'folder' | 'item' | 'variable';

/**
 * One searchable thing of the open workspace: the envelope a result is drawn from. Names only —
 * never a path or an id, which the person has never seen — and a variable enters by name and
 * never by value, or the box becomes an oracle that leaks secrets three letters at a time.
 */
export type SearchEntry = {
    source: SearchSource;
    resource: ResourceUri;
    name: string;
    /**
     * The names of what holds it, outermost first with a slash between them, matched and shown:
     * for a variable, the name of its environment. Empty when nothing holds it.
     */
    trail: string;
    tags: readonly string[];
};

/**
 * What a feature brings to the search of a workspace: its entries for the origin and the
 * workspace the window has open. The search works both out once; the feature reads its store.
 * A word of its own, that no name of the user gives it, comes through the translator.
 */
export type WorkspaceEntries = (
    origin: string,
    workspaceId: string,
    translate: Translator,
) => SearchEntry[];
