import { ASSERTION_API, type AssertionWord } from './assertion-api.js';
import {
    API_BY_EVENT,
    SCRIPT_API,
    isStandardName,
    type ApiEntry,
    type ApiParameter,
    type ScriptEvent,
} from './script-api.js';

/** Says what one name of the API does, in the language of the window. */
export type DescribeApi = (docKey: string) => string;

/** A name of the API as a tree: what it holds by the next step of its path, and its entry if it ends there. */
type ApiNode = { entry?: ApiEntry; children: Map<string, ApiNode> };

const INDENT = '    ';

/** A JSDoc block: the text, then one `@param` per parameter. A `*\/` in a text cannot close it. */
function docOf(
    describe: DescribeApi,
    docKey: string,
    parameters: readonly ApiParameter[],
    indent: string,
): string {
    const safe = (text: string): string => text.replaceAll('*/', '*\\/');
    const lines = [
        safe(describe(docKey)),
        ...parameters.map(({ name, docKey: key }) => `@param ${name} ${safe(describe(key))}`),
    ];

    return `${indent}/**\n${lines.map((line) => `${indent} * ${line}`).join('\n')}\n${indent} */\n`;
}

function treeOf(entries: readonly ApiEntry[]): ApiNode {
    const root: ApiNode = { children: new Map() };

    for (const entry of entries) {
        let node = root;

        for (const step of entry.name.split('.')) {
            const next = node.children.get(step) ?? { children: new Map() };

            node.children.set(step, next);
            node = next;
        }

        node.entry = entry;
    }

    return root;
}

/** The name of the interface of an object of the API: `MandorRequestHeaders`. */
function interfaceName(path: readonly string[]): string {
    return path.map((step) => step.charAt(0).toUpperCase() + step.slice(1)).join('');
}

/** How the interfaces print: the text of each name, and the values the event lets a script write, by path. */
type Printing = { describe: DescribeApi; writable: ReadonlySet<string> };

/** One member of an interface: a method, a value (read only unless the event lets it be written), or an object. */
function memberOf(path: readonly string[], key: string, node: ApiNode, printing: Printing): string {
    const own = [...path, key];
    const { entry } = node;

    if (entry === undefined) {
        return `${INDENT}readonly ${key}: ${interfaceName(own)};`;
    }

    const doc = docOf(printing.describe, entry.docKey, entry.parameters, INDENT);

    if (entry.signature.startsWith('(')) {
        return `${doc}${INDENT}${key}${entry.signature};`;
    }

    const readonly = printing.writable.has(own.join('.')) ? '' : 'readonly ';

    return `${doc}${INDENT}${readonly}${key}: ${entry.signature};`;
}

/** The interface of the object at `path`, with one member per name under it. */
function interfaceOf(path: readonly string[], node: ApiNode, printing: Printing): string {
    const members = [...node.children].map(([step, child]) =>
        memberOf(path, step, child, printing),
    );

    return `interface ${interfaceName(path)} {\n${members.join('\n')}\n}`;
}

/** The interfaces of every object under `node`, at any depth, its own left out. */
function nestedInterfacesOf(path: readonly string[], node: ApiNode, printing: Printing): string[] {
    return [...node.children]
        .filter(([, child]) => child.entry === undefined)
        .flatMap(([step, child]) => [
            interfaceOf([...path, step], child, printing),
            ...nestedInterfacesOf([...path, step], child, printing),
        ]);
}

function assertionMember(word: AssertionWord, describe: DescribeApi): string {
    const doc = docOf(describe, word.docKey, word.parameters, INDENT);

    return word.signature === undefined
        ? `${doc}${INDENT}readonly ${word.name}: Assertion;`
        : `${doc}${INDENT}${word.name}${word.signature};`;
}

const SEARCH_PARAMS_MEMBERS = `    append(name: string, value: unknown): void;
    delete(name: string, value?: unknown): void;
    get(name: string): string | null;
    getAll(name: string): string[];
    has(name: string, value?: unknown): boolean;
    set(name: string, value: unknown): void;
    toString(): string;
    entries(): IterableIterator<[string, string]>;
    keys(): IterableIterator<string>;
    values(): IterableIterator<string>;
    [Symbol.iterator](): IterableIterator<[string, string]>;`;

/** A name of JavaScript the guest gives: an object, a function or a class. */
function standardOf(step: string, node: ApiNode, describe: DescribeApi): string[] {
    const { entry } = node;

    if (entry === undefined) {
        const printing: Printing = { describe, writable: new Set() };

        return [
            interfaceOf([step], node, printing),
            ...nestedInterfacesOf([step], node, printing),
            `declare const ${step}: ${interfaceName([step])};`,
        ];
    }

    const doc = docOf(describe, entry.docKey, entry.parameters, '');

    if (entry.signature.startsWith('new ')) {
        const constructor = entry.signature.slice('new '.length).replace(/\): \w+$/, ')');

        return [
            `declare class ${step} {\n${docOf(describe, entry.docKey, entry.parameters, INDENT)}${INDENT}constructor${constructor};\n${SEARCH_PARAMS_MEMBERS}\n}`,
        ];
    }

    return [`${doc}declare function ${step}${entry.signature};`];
}

/**
 * The declarations a script of `event` is checked against: `mandor` with what the event shows and
 * nothing more, the names of JavaScript the guest gives, and `Assertion`. A member the event does
 * not show is a type error, not a silence. Every name carries its text, in the language
 * `describe` speaks. Each interface of `mandor` is there, whatever the event: `sendRequest` gives
 * back a `MandorResponse` before any response.
 */
export function scriptTypesOf(event: ScriptEvent, describe: DescribeApi): string {
    const { members, requestWrites } = API_BY_EVENT[event];
    const standard = treeOf(SCRIPT_API.filter(({ owner }) => isStandardName(owner)));
    const everyMember = treeOf(SCRIPT_API.filter(({ owner }) => !isStandardName(owner)));
    const shown = new Map(
        [...everyMember.children].filter(([step]) => members.some((member) => member === step)),
    );
    const printing: Printing = {
        describe,
        writable: new Set(requestWrites.map((name) => `mandor.request.${name}`)),
    };
    const mandor = interfaceOf(['mandor'], { children: shown }, printing);
    const nested = nestedInterfacesOf(['mandor'], everyMember, printing);
    const assertion = ASSERTION_API.map((word) => assertionMember(word, describe));

    return [
        ...[...standard.children].flatMap(([step, node]) => standardOf(step, node, describe)),
        `interface Assertion {\n${assertion.join('\n')}\n}`,
        mandor,
        ...nested,
        'declare const mandor: Mandor;',
        '',
    ].join('\n\n');
}
