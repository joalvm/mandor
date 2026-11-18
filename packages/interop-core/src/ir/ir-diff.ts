import type {
    InteropChannel,
    InteropDocument,
    InteropMessage,
    InteropOperation,
    InteropServer,
} from './interop-document.js';
import { httpDiff } from './ir-diff-http.js';
import { equalDiff, keyed, sameSet } from './ir-diff-keyed.js';
import { irEqual } from './ir-equal.js';
import { isRecord } from './is-record.js';

/**
 * The semantic differences between two documents of the model: what says something different,
 * named by the path where it says it. The order of every collection is outside the comparison —
 * YAML and JSON each serialize in their own order, and an order means nothing the content
 * doesn't mean better — while the order inside a value, an example list above all, is kept:
 * there it is content.
 *
 * `sourceId` never compares: it is the identity of the bytes a document came from, and a
 * reimport of an export is by definition made of different bytes. `notes` neither: it is what
 * an import said about the document it read, not content the workspace holds.
 */
export function irDiff(left: InteropDocument, right: InteropDocument): string[] {
    const differences: string[] = [];

    if (left.name !== right.name) {
        differences.push('name');
    }

    differences.push(...keyed('servers', left.servers, right.servers, serverDiff));

    differences.push(
        ...keyed('security', entriesOf(left.security), entriesOf(right.security), securityDiff),
    );

    if (!sameSet(left.defaultSecurity, right.defaultSecurity)) {
        differences.push('defaultSecurity');
    }

    differences.push(...keyed('channels', left.channels, right.channels, channelDiff));
    differences.push(...keyed('operations', left.operations, right.operations, operationDiff));
    differences.push(
        ...keyed(
            'payloadSchemas',
            entriesOf(left.payloadSchemas),
            entriesOf(right.payloadSchemas),
            equalDiff,
        ),
    );

    if (!irEqual(left.extras, right.extras)) {
        differences.push('extras');
    }

    return differences;
}

function entriesOf(record: Record<string, { text?: string; type?: string }>): Entry[] {
    return Object.entries(record).map(([name, value]) => ({ name, ...value }));
}

type Entry = { name: string; text?: string; type?: string; extras?: unknown };

function serverDiff(path: string, left: InteropServer, right: InteropServer): string[] {
    const differences: string[] = [];

    if (left.url !== right.url) {
        differences.push(`${path}.url`);
    }

    if (left.protocol !== right.protocol) {
        differences.push(`${path}.protocol`);
    }

    if (!irEqual(left.security, right.security)) {
        differences.push(`${path}.security`);
    }

    // A model kept as JSON drops the keys it holds undefined, and a read fills them empty:
    // absent and empty say the same thing here, as they do inside `irEqual`.
    if (!irEqual(variablesOf(left), variablesOf(right))) {
        differences.push(`${path}.variables`);
    }

    if (!irEqual(left.extras, right.extras)) {
        differences.push(`${path}.extras`);
    }

    return differences;
}

/** The variables of a server, as the model kept them: JSON may have dropped the empty ones. */
function variablesOf(server: InteropServer): Record<string, unknown> {
    const variables: unknown = server.variables;

    return isRecord(variables) ? variables : {};
}

function securityDiff(path: string, left: unknown, right: unknown): string[] {
    return irEqual(left, right) ? [] : [`${path}.scheme`];
}

function channelDiff(path: string, left: InteropChannel, right: InteropChannel): string[] {
    const differences: string[] = [];

    if (left.address !== right.address) {
        differences.push(`${path}.address`);
    }

    if (left.description !== right.description) {
        differences.push(`${path}.description`);
    }

    if (!irEqual(left.extras, right.extras)) {
        differences.push(`${path}.extras`);
    }

    return differences;
}

function operationDiff(path: string, left: InteropOperation, right: InteropOperation): string[] {
    const differences: string[] = [];

    if (left.channel !== right.channel) {
        differences.push(`${path}.channel`);
    }

    if (left.direction !== right.direction) {
        differences.push(`${path}.direction`);
    }

    if (!irEqual(left.security, right.security)) {
        differences.push(`${path}.security`);
    }

    differences.push(...messageDiff(`${path}.message`, left.message, right.message));
    differences.push(...httpDiff(`${path}.http`, left.http, right.http));

    if (!irEqual(left.extras, right.extras)) {
        differences.push(`${path}.extras`);
    }

    return differences;
}

function messageDiff(
    path: string,
    left: InteropMessage | undefined,
    right: InteropMessage | undefined,
): string[] {
    if (left === undefined || right === undefined) {
        return left === right ? [] : [path];
    }

    return irEqual(left, right) ? [] : [path];
}
