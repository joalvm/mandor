import {
    declaredVariablesOf,
    sampleFieldPaths,
    type ScriptContext,
    type ScriptEvent,
    type ScriptVariable,
} from '@mandor/script';
import type { EditorSuggestion, GhostTextOf, SuggestionsOf } from '@mandor/ui';

/** The text of a key of `collections`, in the language of the window. */
type Describe = (key: string) => string;

/** Inside the text of a name: what is written after the quote is the first group. */
const VARIABLE_NAME =
    /(?<![\w$.])mandor\s*\.\s*variables\s*\.\s*(?:get|set|has)\s*\(\s*["'`]([^"'`\\]*)$/u;

const HEADER_NAME =
    /(?<![\w$.])mandor\s*\.\s*request\s*\.\s*headers\s*\.\s*(?:get|has|delete)\s*\(\s*["'`]([^"'`\\]*)$/u;

/** Where a statement starts: nothing on the line but the word being written. */
const STATEMENT_START = /^\s*[\w$]*$/u;

const AFTER_SET = /(?<![\w$.])mandor\s*\.\s*variables\s*\.\s*set\s*\(\s*$/u;

type SnippetName =
    | 'fieldTest'
    | 'headerFromVariable'
    | 'sendRequest'
    | 'statusTest'
    | 'variableFromMessage'
    | 'variableFromResponse';

/** What each snippet writes, with its places to fill in the order Tab visits them. */
const SNIPPETS: Record<SnippetName, string> = {
    fieldTest:
        'mandor.test("${1:has the field}", () => {\n\tmandor.expect(mandor.response.json()).to.have.property("${2:field}");\n});',
    headerFromVariable:
        'mandor.request.headers.set("${1:Authorization}", mandor.variables.get("${2:name}"));',
    sendRequest: 'const ${1:response} = await mandor.sendRequest({ url: "${2:https://}" });',
    statusTest:
        'mandor.test("${1:status is 200}", () => {\n\tmandor.expect(mandor.response.status).to.equal(${2:200});\n});',
    variableFromMessage: 'mandor.variables.set("${1:name}", mandor.message.json().${2:field});',
    variableFromResponse: 'mandor.variables.set("${1:name}", mandor.response.json().${2:field});',
};

/** The snippets of each moment: each writes only what its moment shows to a script. */
const SNIPPETS_OF: Record<ScriptEvent, readonly SnippetName[]> = {
    onBeforeRequest: ['headerFromVariable', 'sendRequest'],
    onResponse: ['variableFromResponse', 'statusTest', 'fieldTest', 'sendRequest'],
    onBeforeConnect: ['headerFromVariable', 'sendRequest'],
    onConnect: ['sendRequest'],
    onMessage: ['variableFromMessage'],
};

/** Where the moment finds a sample to read, as a script writes it. */
const SAMPLE_READ: Partial<Record<ScriptEvent, string>> = {
    onResponse: 'mandor.response.json()',
    onMessage: 'mandor.message.json()',
};

function lineBefore(text: string, offset: number): string {
    return text.slice(text.lastIndexOf('\n', offset - 1) + 1, offset);
}

function documentationOf(variable: ScriptVariable, describe: Describe): string {
    const origin = describe(`script.completion.origin.${variable.origin}`);

    return variable.secret ? `${origin} · ${describe('script.completion.secret')}` : origin;
}

/** The variables of the place, then the ones the script declares: one each, the first one wins. */
function variablesIn(context: ScriptContext, text: string): ScriptVariable[] {
    const declared = declaredVariablesOf([text]).map((name): ScriptVariable => ({
        name,
        origin: 'script',
        secret: false,
        value: '',
    }));
    const byName = new Map<string, ScriptVariable>();

    [...context.variables, ...declared].forEach((variable) => {
        byName.set(variable.name, byName.get(variable.name) ?? variable);
    });

    return [...byName.values()];
}

type NamePlace = {
    at: RegExp;
    suggest: (text: string, from: number) => EditorSuggestion[];
};

function namePlacesOf(context: ScriptContext, describe: Describe): readonly NamePlace[] {
    return [
        {
            at: VARIABLE_NAME,
            suggest: (text, from) =>
                variablesIn(context, text).map((variable) => ({
                    detail: variable.value === '' ? undefined : variable.value,
                    documentation: documentationOf(variable, describe),
                    from,
                    insertText: variable.name,
                    kind: 'variable',
                    label: variable.name,
                })),
        },
        {
            at: HEADER_NAME,
            suggest: (_text, from) =>
                [...new Set(context.headers)].map((header) => ({
                    from,
                    insertText: header,
                    kind: 'field',
                    label: header,
                })),
        },
    ];
}

/**
 * What the list of a script offers beyond the names of the API: inside the text of a variable,
 * the variables of the place with their value (a secret only masked); inside the text of a
 * header, the headers of the request; where a statement starts, the snippets of the moment.
 */
export function scriptSuggestionsOf(
    event: ScriptEvent,
    context: ScriptContext,
    describe: Describe,
): SuggestionsOf {
    const places = namePlacesOf(context, describe);
    const snippets: EditorSuggestion[] = SNIPPETS_OF[event].map((name) => ({
        insertText: SNIPPETS[name],
        kind: 'snippet',
        label: describe(`script.snippet.${name}`),
    }));

    return (text, offset) => {
        const line = lineBefore(text, offset);

        for (const place of places) {
            const written = place.at.exec(line)?.[1];

            if (written !== undefined) {
                return place.suggest(text, offset - written.length);
            }
        }

        return STATEMENT_START.test(line) ? snippets : [];
    };
}

/**
 * What the editor proposes greyed right after `mandor.variables.set(`: to save the field of the
 * sample named like a variable of the environment, read as the moment reads it. None in a moment
 * with nothing to read, or with no variable of the environment named like a field.
 */
export function scriptGhostTextOf(
    event: ScriptEvent,
    context: ScriptContext,
): GhostTextOf | undefined {
    const read = SAMPLE_READ[event];
    const paths = sampleFieldPaths(context.sample);
    const saved = context.variables.find(
        ({ name, origin }) => origin === 'environment' && paths.has(name),
    );

    if (read === undefined || saved === undefined) {
        return undefined;
    }

    const proposal = `${JSON.stringify(saved.name)}, ${read}${String(paths.get(saved.name))}`;

    return (text, offset) => {
        if (!AFTER_SET.test(lineBefore(text, offset))) {
            return undefined;
        }

        const closed = text.startsWith(')', offset);

        return closed ? proposal : `${proposal})`;
    };
}
