import { hasOwnScripts, type RequestSettings } from '@mandor/schema';

import type { OutlineLoss, UnwrittenKinds } from './outline-kind.js';
import type {
    WorkspaceData,
    WorkspaceFolderNode,
    WorkspaceFolderSettings,
} from './workspace-data.js';

/**
 * What a level holds and a format may lose: each of its settings, the folders under it, and those
 * of its variables that are switched off, for a format that cannot say that.
 */
type LevelPart = keyof WorkspaceFolderSettings | 'folders' | 'disabledVariables';

/** What a format says of each part it does not keep. A part not named here is kept. */
export type UnkeptParts = Partial<Record<LevelPart, OutlineLoss>>;

/**
 * What a format does not keep of a collection, and of a folder; for one with no level above the
 * collection, where the connections end up when the workspace has several collections; and what
 * it loses of an environment or of the globals that hold a variable switched off, of a connection
 * with a query parameter switched off, and of a message when no connection can hold it. What it
 * loses of a request and of a message is below; a format that names nothing keeps it all.
 */
export type UnkeptLevels = {
    collection: UnkeptParts;
    folder: UnkeptParts;
    connections?: OutlineLoss;
    environments?: OutlineLoss;
    connectionQueryOff?: OutlineLoss;
    messagesNeedConnection?: OutlineLoss;
    /**
     * Whether it writes the scripts of a request and of its levels, as they are. Absent for the
     * format of Mandor itself, the only one that also keeps the scripts of a connection.
     */
    writesScripts?: boolean;
    request?: UnkeptOfRequest;
    message?: UnkeptOfMessage;
};

/** What a format loses of a request. `settingsKept` lists the settings it has a place for. */
type UnkeptOfRequest = {
    tags?: OutlineLoss;
    examples?: OutlineLoss;
    /** The examples of a GraphQL request, for a format that keeps them only on HTTP ones. */
    graphqlExamples?: OutlineLoss;
    /** The JSON Schemas of its body and of its answers. */
    schemas?: OutlineLoss;
    settingsKept?: readonly (keyof RequestSettings)[];
};

/** What a format loses of a message: where it ends up, and the details it has no place for. */
type UnkeptOfMessage = { byName?: OutlineLoss | undefined; details?: OutlineLoss };

/** What a node of the outline says it loses, when it loses anything. */
export type LevelNote = { unkept?: OutlineLoss[] };

const HOLDS: Readonly<Record<LevelPart, (level: WorkspaceFolderNode) => boolean>> = {
    description: ({ settings }) => (settings.description ?? '') !== '',
    variables: ({ settings }) => settings.variables.length > 0,
    auth: ({ settings }) => settings.auth !== undefined,
    headers: ({ settings }) => settings.headers.length > 0,
    scripts: ({ settings }) => hasOwnScripts(settings.scripts),
    disabledVariables: ({ settings }) => settings.variables.some(({ enabled }) => !enabled),
    folders: ({ folders }) => folders.length > 0,
};

const IN_ORDER: readonly LevelPart[] = [
    'description',
    'variables',
    'disabledVariables',
    'auth',
    'headers',
    'scripts',
    'folders',
];

/** What a level would lose in a format: the losses of the parts it holds, and nothing if none. */
export function unkeptOf(
    level: WorkspaceFolderNode,
    parts: UnkeptParts,
): OutlineLoss[] | undefined {
    const losses = IN_ORDER.filter((part) => HOLDS[part](level)).flatMap(
        (part) => parts[part] ?? [],
    );

    return losses.length === 0 ? undefined : losses;
}

/** The own scripts of a level or a request, when the format writes no script. */
export function ownScriptsLossOf(
    held: Record<string, unknown> | undefined,
    { writesScripts }: UnkeptLevels,
): OutlineLoss[] {
    return writesScripts === false && hasOwnScripts(held) ? ['scriptsNotCarried'] : [];
}

/** The scripts of a connection: no format but Mandor's own has a place for them. */
function connectionScriptsLossOf(
    held: Record<string, unknown> | undefined,
    { writesScripts }: UnkeptLevels,
): OutlineLoss[] {
    return writesScripts !== undefined && hasOwnScripts(held) ? ['scriptsNotCarried'] : [];
}

/** The note of a level, when the format loses something it holds. */
export function levelNoteOf(
    level: WorkspaceFolderNode,
    parts: UnkeptParts,
    unkept: UnkeptLevels,
): LevelNote {
    const losses = [
        ...(unkeptOf(level, parts) ?? []),
        ...ownScriptsLossOf(level.settings.scripts, unkept),
    ];

    return losses.length === 0 ? {} : { unkept: [...new Set(losses)] };
}

/** Where a message goes says something only when there is more than one place it could go. */
export function unkeptIn(data: WorkspaceData, unkept: UnkeptLevels): UnkeptLevels {
    const sockets = data.connections.filter(({ transport }) => transport === 'websocket');

    return sockets.length > 1 || unkept.message === undefined
        ? unkept
        : { ...unkept, message: { ...unkept.message, byName: undefined } };
}

/** The note of what holds variables and no level, when the format cannot switch one off. */
export function variablesNoteOf(
    variables: readonly { enabled: boolean }[],
    unkept: UnkeptLevels,
): LevelNote {
    return unkept.environments !== undefined && variables.some(({ enabled }) => !enabled)
        ? { unkept: [unkept.environments] }
        : {};
}

/** Where the connections go when no level holds them and several collections could. */
export function connectionNoteOf(
    data: WorkspaceData,
    connection: WorkspaceData['connections'][number],
    unkept: UnkeptLevels,
): LevelNote {
    const queryOff = (connection.params ?? []).some(({ enabled }) => !enabled);
    const losses = [
        ...connectionScriptsLossOf(connection.scripts, unkept),
        ...(data.collections.length > 1 ? [unkept.connections] : []),
        ...(queryOff ? [unkept.connectionQueryOff] : []),
    ].filter((loss) => loss !== undefined);

    return losses.length === 0 ? {} : { unkept: losses };
}

/** A message a format keeps inside a connection has no place when there is none to write. */
export function unwrittenIn(
    data: WorkspaceData,
    unwritten: UnwrittenKinds,
    { messagesNeedConnection }: UnkeptLevels,
): UnwrittenKinds {
    return messagesNeedConnection === undefined ||
        data.connections.some(({ transport }) => transport === 'websocket')
        ? unwritten
        : { ...unwritten, message: messagesNeedConnection };
}
