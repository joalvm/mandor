import { z } from 'zod';

import { authConfigSchema } from '../auth/auth-config-schema.js';
import { connectionSchema } from '../connection/connection-schema.js';
import { docNameSchema } from '../doc/doc-name-schema.js';
import { environmentSchema } from '../environment/environment-schema.js';
import { entityNameSchema } from '../fields/entity-name-schema.js';
import { slugSchema } from '../fields/slug-schema.js';
import { WORKSPACE_KINDS } from '../workspace/workspace-kinds.js';
import { plainVariableSchema } from '../environment/plain-variable-schema.js';
import { variableSchema } from '../environment/variable-schema.js';
import { requestLineSchema } from '../request/request-item-schema.js';
import { requestScriptsSchema } from '../script/own-scripts-schema.js';

/** An item as the bundle carries it: the envelope, and the body of its kind kept whole. */
const bundleItemSchema = z.object({
    kind: slugSchema,
    name: entityNameSchema,
    tags: z.array(entityNameSchema).default([]),
    body: z.record(z.string(), z.unknown()),
});

const bundleFolderFields = z.object({
    name: entityNameSchema,
    description: z.string().optional(),
    variables: z.array(plainVariableSchema).default([]),
    auth: authConfigSchema.optional(),
    headers: z.array(requestLineSchema).default([]),
    scripts: requestScriptsSchema.optional(),
    /** What an import left beside the scripts in a bundle written before they joined them. */
    importedScripts: z.unknown().optional(),
    items: z.array(bundleItemSchema).default([]),
    /** How folders and items mix, when a folder comes after an item. */
    sequence: z.array(z.enum(['folder', 'item'])).optional(),
});

/**
 * A collection or a folder, one shape as on the disk: what it declares of itself, the folders
 * inside it at any depth and its items. A bundle of the first version has no key but the items,
 * the auth and the description, and stays flat: it lost its tree when it was written.
 */
type BundleFolder = z.infer<typeof bundleFolderFields> & { folders: BundleFolder[] };

const bundleFolderSchema: z.ZodType<BundleFolder> = z.lazy(() =>
    bundleFolderFields.extend({ folders: z.array(bundleFolderSchema).default([]) }),
);

/** `title` is missing from bundles made before docs carried one: the file name stands in then. */
const bundleDocSchema = z.object({
    name: docNameSchema,
    title: z.string().optional(),
    text: z.string(),
});

const bundleWorkspaceSchema = z.object({
    name: entityNameSchema,
    auth: authConfigSchema.optional(),
    variables: z.array(plainVariableSchema).default([]),
    /** What an import left for every request in a bundle written before scripts joined it. */
    importedScripts: z.unknown().optional(),
});

/**
 * A whole workspace as one file: its settings, environments, collections with their folders and
 * items, notes and, in Realtime, connections. It is the native format of the exchange, so it
 * carries what the domain does and nothing of how a disk lays it out. `formatVersion` is the
 * one of the repo: a bundle of another version is refused whole instead of read in part.
 */
export const workspaceBundleSchema = z.object({
    mandor: z.literal('workspace'),
    formatVersion: z.number().int().positive(),
    app: z.enum(WORKSPACE_KINDS),
    workspace: bundleWorkspaceSchema,
    environments: z.array(environmentSchema).default([]),
    collections: z.array(bundleFolderSchema).default([]),
    // The globals of the origin, secrets blank: what a request resolves against when nothing else
    // names the variable.
    globals: z.array(variableSchema).default([]),
    docs: z.array(bundleDocSchema).default([]),
    connections: z.array(connectionSchema).default([]),
});

export type WorkspaceBundle = z.infer<typeof workspaceBundleSchema>;
