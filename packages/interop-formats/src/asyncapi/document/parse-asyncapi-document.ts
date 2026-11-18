import { type AsyncAPIDocumentInterface, DiagnosticSeverity, Parser } from '@asyncapi/parser';

import { AsyncapiParseError } from './asyncapi-parse-error.js';

type ParserOptions = NonNullable<ConstructorParameters<typeof Parser>[0]>;

/**
 * How a reference names itself from inside the document it points at. An address is absolute;
 * a file is read against its own folder, so its bare name is itself, and the full path would
 * be joined to that folder again on every lookup.
 */
const SELF_OF: Record<string, (uri: string) => string> = {
    file: (uri) => uri.slice(uri.lastIndexOf('/') + 1),
    http: (uri) => uri,
    https: (uri) => uri,
};

// A document is data. An external `$ref` is a path or an address someone else chose, and
// following it would read a file or the network on the user's behalf: it stays a reference. The
// parser keeps its own readers of these schemes and falls back to them after one that throws,
// so each is answered first with a document that refers to itself, which ends the lookup. A
// pointer into that document finds nothing, and the parse says so.
const KEEP_EXTERNAL_REFS: ParserOptions = {
    __unstable: {
        resolver: {
            resolvers: Object.entries(SELF_OF).map(([schema, self]) => ({
                schema,
                order: 1,
                read: (uri: { toString: () => string }) =>
                    JSON.stringify({ $ref: self(uri.toString()) }),
            })),
        },
    },
};

const parser = new Parser(KEEP_EXTERNAL_REFS);

/**
 * The diagnostics are typed by the linter's own copy of `@stoplight/types`, so the enum the parser
 * exports is another type to the compiler, with the same values: the two meet as numbers.
 */
function isError(severity: number): boolean {
    return severity === DiagnosticSeverity.Error.valueOf();
}

/**
 * The one place that reads the parser. The model comes out resolved — local `$ref` followed, 2.x and
 * 3.x wearing one shape — and the raw parsed object comes with it, because extras and bindings
 * read better as they were written than through the model's accessor maze.
 */
export async function parseAsyncapiDocument(
    text: string,
): Promise<{ document: AsyncAPIDocumentInterface; raw: Record<string, unknown> }> {
    const { document, diagnostics } = await parser.parse(text);

    if (document === undefined) {
        const errors = diagnostics
            .filter((diagnostic) => isError(diagnostic.severity))
            .map(diagnosticMessage);

        throw new AsyncapiParseError(
            errors.length > 0 ? errors : diagnostics.map(diagnosticMessage),
        );
    }

    return { document, raw: document.json() };
}

function diagnosticMessage(diagnostic: { message: unknown }): string {
    return String(diagnostic.message);
}
