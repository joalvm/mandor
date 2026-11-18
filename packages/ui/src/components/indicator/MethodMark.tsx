import { cn } from '../../lib/cn.js';

type MethodMarkProps = {
    /**
     * The short form a list or a tab can afford: the word cut to the letters that still tell it
     * apart, smaller and heavier. A list that wants its names in one column gives it a fixed slot.
     */
    compact?: boolean | undefined;
    method: string;
};

/** Each standard verb wears its own hue; a verb the list does not know reads as plain text. */
const METHOD_TONES: Readonly<Record<string, string>> = {
    DELETE: 'text-text-method-delete',
    GET: 'text-text-method-get',
    HEAD: 'text-text-method-head',
    OPTIONS: 'text-text-method-options',
    PATCH: 'text-text-method-patch',
    POST: 'text-text-method-post',
    PUT: 'text-text-method-put',
};

/** The verbs too long for the compact slot, cut the way every HTTP client cuts them. */
const SHORT_FORMS: Readonly<Record<string, string>> = {
    DELETE: 'DEL',
    OPTIONS: 'OPT',
};

/**
 * The verb of a request, in the hue that tells it apart at a glance: the same word and the same
 * hue in the tree, the tab and the address bar, so the eye learns it once. The hue is content,
 * never state — a red DELETE says what the request is, not that something went wrong.
 */
export function MethodMark({ compact = false, method }: MethodMarkProps) {
    const word = method.toUpperCase();

    return (
        <span
            className={cn(
                'shrink-0 tracking-wide',
                METHOD_TONES[word] ?? 'text-text-secondary',
                // The full word takes the weight of where it sits: a menu tells its chosen line by it.
                compact ? 'text-2xs font-semibold' : 'text-xs',
            )}
            data-method={word}
            data-part="method-mark"
        >
            {compact ? (SHORT_FORMS[word] ?? word) : word}
        </span>
    );
}
