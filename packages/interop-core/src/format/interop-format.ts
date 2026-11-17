import type { ImportResource } from '../resource/import-resource.js';
import type { InteropScope } from '../scope/interop-scope.js';
import type { WorkspaceData } from '../workspace/workspace-data.js';
import type { UnwrittenKinds } from '../workspace/outline-kind.js';
import type { UnkeptLevels } from '../workspace/unkept-parts.js';
import type { InteropInput } from './interop-input.js';

/**
 * A document of a format while it is still data: an object, which is what JSON and YAML write.
 * The border redacts it here, before it is text, so a value is never split by how it prints.
 */
export type FormatDocument = Record<string, unknown>;

/** One file of an import. The path is relative: a folder keeps the shape it had. */
export type InteropFile = { path: string; text: string };

/** What an import carries: the name the document gave itself, and what the workspace holds of it. */
export type InteropRead = { name: string; resources: ImportResource[] };

/** One file of an export, still data: the path it takes inside what the user picked. */
export type FormatFile = { path: string; document: FormatDocument };

/**
 * What the pipeline asks of a format once it is loaded. Importing reads files into what the
 * workspace holds; exporting writes the workspace as documents, and each document as text.
 * Nothing past these three knows which format it was.
 */
export type InteropCodec = {
    /** Refuses with `problems` when the files are not a document of the format. */
    read: (files: readonly InteropFile[], scope: InteropScope) => Promise<InteropRead>;
    documentsOf: (data: WorkspaceData) => FormatFile[];
    textOf: (document: FormatDocument) => string;
};

/**
 * A format as the app lists it. The codec loads when an import or an export asks for it: a
 * parser weighs megabytes, and listing a format must not load one at startup.
 */
export type InteropFormat = {
    /** What the renderer names when it asks for this format. */
    id: string;
    /** How the dialogs of the system name its files. */
    label: string;
    /** The extensions of the files it imports, without the dot. */
    reads: readonly string[];
    /** The extensions of the files it exports, without the dot. */
    writes: readonly string[];
    /** What it covers: a format that lists `workspace` can carry the whole workspace. */
    scopes: readonly InteropScope[];
    /** What the person picks to import it. */
    input: InteropInput;
    /**
     * What of a workspace the format has no place for, by the kind of node, with the reason the
     * export gives for leaving it out. A kind not named here is written.
     */
    unwritten: UnwrittenKinds;
    /**
     * What it does not keep of a collection or a folder, or keeps somewhere else, by the part of
     * the level, with the phrase the export says of it. A part not named here is kept.
     */
    unkept: UnkeptLevels;
    /**
     * Whether the files look like a document of this format. It reads the shape of the root and
     * nothing else, and never loads the codec: the app asks every format it lists before it
     * knows which one to load.
     */
    sniff: (files: readonly InteropFile[]) => boolean;
    load: () => Promise<InteropCodec>;
};
