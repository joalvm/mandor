// The only barrel in the package. It states the public API and nothing else:
// inside the package every module imports the file that defines the symbol.

export { readFolderChain } from './collection/read-folder-chain.js';
export { writeAuth } from './auth/write-auth.js';

export {
    collectionDir,
    collectionsFile,
    folderDir,
    folderFile,
    itemFile,
} from './collection/collection-path.js';
export {
    createCollectionFolder,
    type NewCollectionFolder,
} from './collection/create-collection-folder.js';
export { collectionDefinitionFile } from './collection/collection-path.js';
export { orderFile } from './collection/collection-level.js';
export {
    collectionFilePlace,
    type CollectionFilePlace,
} from './collection/collection-file-place.js';
export { absentWhenEmpty, patchFolderSettings } from './collection/patch-folder-settings.js';
export { mergeImportedGlobals, mergeVariables } from './globals/merge-imported-globals.js';
export { readGlobals } from './globals/read-globals.js';
export { globalsTextWith, writeGlobals } from './globals/write-globals.js';
export { createCollectionItem } from './collection/create-collection-item.js';
export { moveCollectionNode } from './collection/move-collection-node.js';
export { reorderCollectionNode } from './collection/reorder-collection-node.js';
export { NameTakenError } from './collection/name-taken-error.js';
export { RootItemError } from './collection/root-item-error.js';
export { renameFolder } from './collection/rename-folder.js';
export { renameItem } from './collection/rename-item.js';
export { readCollectionsFile } from './collection/read-collections-file.js';
export { readFolderSettings } from './collection/read-folder-settings.js';
export { createCollection } from './collection/create-collection.js';
export {
    type FolderSettingsPatch,
    writeFolderSettings,
} from './collection/write-folder-settings.js';
export { removeCollectionNode } from './collection/remove-collection-node.js';
export { readCollectionTree } from './collection/read-collection-tree.js';
export { readItem } from './collection/read-item.js';
export { itemTextWith } from './collection/item-text-with.js';
export { writeItem } from './collection/write-item.js';

export { conflictId } from './conflict/conflict-path.js';
export { listConflicts } from './conflict/list-conflicts.js';
export { removeConflict } from './conflict/remove-conflict.js';
export { writeConflict } from './conflict/write-conflict.js';

export { connectionFile } from './connection/connection-path.js';
export { createConnection } from './connection/create-connection.js';
export { deleteConnection } from './connection/delete-connection.js';
export { listConnections } from './connection/list-connections.js';
export { readConnection } from './connection/read-connection.js';
export { type ConnectionPatch, connectionTextWith } from './connection/connection-text-with.js';
export { updateConnection } from './connection/update-connection.js';

export { atomicWrite } from './disk/atomic-write.js';
export { inTurn } from './disk/in-turn.js';
export type { DiskChange } from './disk/disk-change.js';
export { documentOf } from './disk/document-of.js';
export { fileExists } from './disk/file-exists.js';
export { FileReadError } from './disk/file-read-error.js';
export type { LoadWarning } from './disk/load-warning.js';
export { MAX_FILE_BYTES, readFileText } from './disk/read-file-text.js';
export { readOrThrow } from './disk/read-or-throw.js';
export { readTextOrNull } from './disk/read-text.js';
export { renameWithRetry } from './disk/rename-with-retry.js';
export { type RepoWatcher, watchRepo } from './disk/watch-repo.js';

export { cookieJarFile } from './cookies/cookie-jar-path.js';

export { createDoc } from './doc/create-doc.js';
export { deleteDoc } from './doc/delete-doc.js';
export { docParts, titleOfDoc } from './doc/doc-parts.js';
export { docFile, docRepoPath, docsDir } from './doc/doc-path.js';
export { docTextWith } from './doc/doc-text-with.js';
export { listDocs } from './doc/list-docs.js';
export { readDoc } from './doc/read-doc.js';
export { replaceDoc } from './doc/replace-doc.js';
export { retitleDoc } from './doc/retitle-doc.js';
export { writeDoc } from './doc/write-doc.js';

export { environmentFile } from './environment/environment-path.js';
export {
    activeEnvironmentsFile,
    readActiveEnvironments,
    writeActiveEnvironments,
} from './environment/active-environments.js';
export { deleteEnvironment } from './environment/delete-environment.js';
export { type EnvironmentPatch, environmentTextWith } from './environment/environment-text-with.js';
export { listEnvironments } from './environment/list-environments.js';
export { readEnvironment } from './environment/read-environment.js';
export { keepSecrets, type KeptSecret, type SecretKeeper } from './environment/secret-keeper.js';
export { updateEnvironment } from './environment/update-environment.js';
export { writeEnvironment } from './environment/write-environment.js';

export { graphqlSchemaDir, graphqlSchemaFile } from './graphql/graphql-schema-path.js';
export { historyDir, historyEntryFile, historyFileName } from './history/history-path.js';
export { historyOverBudget, historyToPrune, orphanBodies } from './history/history-to-prune.js';
export {
    historyFileNames,
    historySpelling,
    historyWorkspaceIds,
    listHistory,
    readHistoryFiles,
    shapeHistory,
} from './history/list-history.js';
export { readHistoryEntry } from './history/read-history-entry.js';
export { removeHistoryEntries, removeHistoryFiles } from './history/remove-history-entries.js';

export { entityOfPath } from './repo/entity-of-path.js';
export { nameInText } from './repo/name-in-text.js';
export { writeRepoTree } from './repo/write-repo-tree.js';
export { emptyRepo } from './repo/empty-repo.js';
export { loadRepo } from './repo/load-repo.js';
export { mandorDir, globalsFile, repoFile } from './repo/repo-path.js';
export { migrateRepoFormat, needsFormatMigration } from './repo/migrate-repo-format.js';

export { readSession } from './session/read-session.js';
export { bodiesBytes } from './body/bodies-bytes.js';
export { bodiesDir, bodyFile } from './body/body-path.js';
export { removeBodies } from './body/remove-bodies.js';
export { writeSession } from './session/write-session.js';

export { createWorkspace } from './workspace/create-workspace.js';
export { deleteWorkspace } from './workspace/delete-workspace.js';
export { listWorkspaces } from './workspace/list-workspaces.js';
export { renameWorkspace } from './workspace/rename-workspace.js';
export { readWorkspace } from './workspace/read-workspace.js';
export { workspaceDir, workspaceFile } from './workspace/workspace-path.js';
export { writeImportedWorkspace } from './workspace/write-imported-workspace.js';
export { writeDefaultEnvironment } from './workspace/write-default-environment.js';
