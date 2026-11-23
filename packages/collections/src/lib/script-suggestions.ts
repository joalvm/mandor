import {
    API_BY_EVENT,
    SCRIPT_API,
    isStandardName,
    scriptPathOf,
    type ApiEntry,
    type DescribeApi,
    type ScriptEvent,
} from '@mandor/script';
import type { EditorSuggestion, SuggestionsOf } from '@mandor/ui';

/** The path a script is writing at the caret: `mandor.request.headers.se` before `se` is finished. */
const PATH_AT_END = /[A-Za-z_$][\w$]*(?:\.[\w$]*)*$/;

function kindOf(entry: ApiEntry, leaf: boolean, nested: boolean): EditorSuggestion['kind'] {
    if (!leaf) {
        return nested ? 'field' : 'variable';
    }

    if (entry.signature.startsWith('new ')) {
        return 'type';
    }

    return entry.signature.startsWith('(') ? 'directive' : 'field';
}

/** The next step of one name after what is written: `get` of `mandor.request.headers.get` after `mandor.request.headers.`. */
function stepOf(entry: ApiEntry, prefix: string, describe: DescribeApi): EditorSuggestion {
    const rest = scriptPathOf(entry).slice(prefix.length);
    const [step = rest] = rest.split('.');
    const leaf = step === rest;
    const detail = leaf ? { detail: entry.signature, documentation: describe(entry.docKey) } : {};

    return {
        ...detail,
        insertText: step,
        kind: kindOf(entry, leaf, prefix !== ''),
        label: step,
    };
}

/**
 * What a script of one event can write at the caret: the names its event shows, one step of the
 * path at a time. The editor replaces only the word being written, so each suggestion is the step
 * after the last dot, never the whole path again.
 */
export function scriptSuggestions(event: ScriptEvent, describe: DescribeApi): SuggestionsOf {
    const shown: readonly string[] = API_BY_EVENT[event].members;
    const entries = SCRIPT_API.filter(
        ({ owner }) => isStandardName(owner) || shown.includes(owner),
    );

    return (text, offset) => {
        const path = PATH_AT_END.exec(text.slice(0, offset))?.[0] ?? '';
        const prefix = path.slice(0, path.lastIndexOf('.') + 1);
        const steps = new Map<string, EditorSuggestion>();

        for (const entry of entries.filter((each) => scriptPathOf(each).startsWith(prefix))) {
            const suggestion = stepOf(entry, prefix, describe);

            if (!steps.has(suggestion.label) || suggestion.detail !== undefined) {
                steps.set(suggestion.label, suggestion);
            }
        }

        return [...steps.values()];
    };
}
