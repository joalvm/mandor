import type {
    CollectionItemFields,
    CollectionNode,
    Environment,
    FolderChainLevel,
    Globals,
} from '@mandor/schema';
import type { AppArea } from './app-area.js';
import type { AuthArea } from './auth-area.js';
import type { CollectionChainRequest } from '../collection/collection-chain.js';
import type { CollectionSettingsWriteRequest } from '../collection/collection-settings-write.js';
import type { GlobalsReadRequest, GlobalsWriteRequest } from '../globals/globals-contract.js';
import type { CollectionCreateRequest } from '../collection/collection-create.js';
import type { CollectionDeleteRequest } from '../collection/collection-delete.js';
import type { CollectionMoveRequest } from '../collection/collection-move.js';
import type { CollectionReadItemRequest } from '../collection/collection-read-item.js';
import type { CollectionRenameRequest } from '../collection/collection-rename.js';
import type { CollectionWriteItemRequest } from '../collection/collection-write-item.js';
import type { CollectionReorderRequest } from '../collection/collection-reorder.js';
import type {
    CollectionSearchHit,
    CollectionSearchRequest,
} from '../collection/collection-search.js';
import type { CollectionTreeRequest } from '../collection/collection-tree.js';
import type { ImportApplyRequest, ImportApplied } from '../import/import-apply.js';
import type { ImportPickRequest, ImportPicked } from '../import/import-pick.js';
import type { ImportProgressPush } from '../import/import-progress.js';
import type { ImportPlanBuildRequest, ImportPlanBuilt } from '../import/import-plan-build.js';
import type { DocBridge } from '../doc/doc-bridge.js';
import type { EnvironmentCreateRequest } from '../environment/environment-create.js';
import type { ActiveEnvironments } from '../environment/environment-active-load.js';
import type {
    EnvironmentDefaultLoadRequest,
    EnvironmentDefaultSaveRequest,
} from '../environment/environment-default.js';
import type { EnvironmentActiveSaveRequest } from '../environment/environment-active-save.js';
import type { EnvironmentDeleteRequest } from '../environment/environment-delete.js';
import type { EnvironmentListRequest } from '../environment/environment-list.js';
import type { EnvironmentUpdateRequest } from '../environment/environment-update.js';
import type { ExportOutline, ExportOutlineRequest } from '../export/export-outline.js';
import type { ExportedFile } from '../export/export-jsonl.js';
import type { ExportWriteRequest } from '../export/export-write.js';
import type { Empty, Result } from '../result/result.js';
import type { SecretClearRequest } from '../secret/secret-clear.js';
import type { SecretKeptRequest } from '../secret/secret-kept.js';
import type { RevealedSecret, SecretRevealRequest } from '../secret/secret-reveal.js';
import type { SecretSetRequest } from '../secret/secret-set.js';
import type { SessionSaveRequest } from '../session/session-save.js';
import type { UiSession } from '../session/ui-session.js';
import type { ConflictArea } from './conflict-area.js';
import type { LogArea } from '../log/log-write.js';
import type { NetworkArea } from './network-area.js';
import type { ScriptsArea } from './scripts-area.js';
import type { NoticeArea } from './notice-area.js';
import type { OriginArea } from './origin-area.js';
import type { UpdateArea } from './update-area.js';
import type { WorkspaceArea } from './workspace-area.js';
import type { MenuEditPush } from '../menu/menu-edit.js';
import type { MenuLanguageRequest } from '../menu/menu-language.js';
import type { RepoArea } from './repo-area.js';
import type { WindowMaximizedPush } from '../window/window-maximized.js';
import type { WindowPopupMenuRequest } from '../window/window-popup-menu.js';

/** What a subscription returns: its own unsubscribe. The emitter never crosses the bridge. */
export type Unsubscribe = () => void;

/**
 * What the host serves to the window of every app, grouped by area. An app whose window needs
 * more extends it with areas of its own, beside their channels; the core never names them.
 * Every method answers with a Result and every payload is validated against the schema of its
 * channel at both edges. Members are function properties, not methods: a reference like
 * `bridge.collections.tree` must stay safe to pass around. No channel names a path: the renderer
 * asks for origins and workspaces, and main resolves them against the active origin, which it
 * alone knows the directory of.
 */
export type CoreBridge = {
    origin: OriginArea;
    workspace: WorkspaceArea;
    auth: AuthArea;
    /** The globals of the active origin: an environment every workspace of it shares. */
    globals: {
        read: (input: GlobalsReadRequest) => Promise<Result<Globals>>;
        write: (input: GlobalsWriteRequest) => Promise<Result<Globals>>;
    };
    collections: {
        /** Structure, names and order of one workspace. Bodies stay on disk until one is opened. */
        tree: (input: CollectionTreeRequest) => Promise<Result<CollectionNode[]>>;
        move: (input: CollectionMoveRequest) => Promise<Result<Empty>>;
        /** Arranges the siblings of one folder, which is the one file a reorder writes. */
        reorder: (input: CollectionReorderRequest) => Promise<Result<Empty>>;
        /** Both rewrite the name in the file and answer nothing: the path is an id and stays. */
        renameFolder: (input: CollectionRenameRequest) => Promise<Result<Empty>>;
        renameItem: (input: CollectionRenameRequest) => Promise<Result<Empty>>;
        /** Answers with the path the new node took, so the tree can point at what it made. */
        create: (input: CollectionCreateRequest) => Promise<Result<string>>;
        delete: (input: CollectionDeleteRequest) => Promise<Result<Empty>>;
        /** The body of one item, flat. Whoever owns the kind validates what it means. */
        readItem: (input: CollectionReadItemRequest) => Promise<Result<CollectionItemFields>>;
        /** Merges into the file, so comments and keys of another window survive the write. */
        writeItem: (input: CollectionWriteItemRequest) => Promise<Result<Empty>>;
        search: (input: CollectionSearchRequest) => Promise<Result<CollectionSearchHit[]>>;
        /**
         * The chain above a place in one read: every collection and folder, the closest first,
         * and the workspace last. Variables, auth and headers of the window all come from it.
         */
        chain: (input: CollectionChainRequest) => Promise<Result<FolderChainLevel[]>>;
        /** Patches what the window edits of a collection or a folder: its words and variables. */
        writeSettings: (input: CollectionSettingsWriteRequest) => Promise<Result<Empty>>;
    };
    import: {
        /** Parses in main and answers the whole difference; the window keeps breathing meanwhile. */
        plan: (input: ImportPlanBuildRequest) => Promise<Result<ImportPlanBuilt>>;
        /** Writes the accepted plan as one commit and answers with what became of each entry. */
        apply: (input: ImportApplyRequest) => Promise<Result<ImportApplied>>;
        /** Asks main for the open dialog of the operating system; no files when it was cancelled. */
        pick: (input: ImportPickRequest) => Promise<Result<ImportPicked>>;
        /** Stops the read in course: a pick answers no files, a plan answers `import-cancelled`. */
        cancel: () => Promise<Result<Empty>>;
        /** How many files main has read of what was picked; the first push says it began. */
        onProgress: (handler: (push: ImportProgressPush) => void) => Unsubscribe;
    };
    environment: {
        create: (input: EnvironmentCreateRequest) => Promise<Result<Environment>>;
        list: (input: EnvironmentListRequest) => Promise<Result<Environment[]>>;
        update: (input: EnvironmentUpdateRequest) => Promise<Result<Environment>>;
        delete: (input: EnvironmentDeleteRequest) => Promise<Result<Empty>>;
        loadActive: () => Promise<Result<ActiveEnvironments>>;
        saveActive: (input: EnvironmentActiveSaveRequest) => Promise<Result<Empty>>;
        /** The environment a workspace takes when nobody chose one, from its own file. */
        loadDefault: (
            input: EnvironmentDefaultLoadRequest,
        ) => Promise<Result<{ environmentId: string | null }>>;
        /** Sets that default, or takes it away with null; it travels with the workspace. */
        saveDefault: (input: EnvironmentDefaultSaveRequest) => Promise<Result<Empty>>;
    };
    secret: {
        set: (input: SecretSetRequest) => Promise<Result<Empty>>;
        clear: (input: SecretClearRequest) => Promise<Result<Empty>>;
        /** One value, by name, because the owner asked. There is no call that reads them all. */
        reveal: (input: SecretRevealRequest) => Promise<Result<RevealedSecret>>;
        /** The names that have a value on this machine. Never the values themselves. */
        kept: (input: SecretKeptRequest) => Promise<Result<string[]>>;
    };
    export: {
        /** What one workspace would export in a format the app listed, as a tree; nothing is written. */
        outline: (input: ExportOutlineRequest) => Promise<Result<ExportOutline>>;
        /** Writes the leaves left marked at the path the dialog of the system answers; null when closed. */
        write: (input: ExportWriteRequest) => Promise<Result<ExportedFile>>;
    };
    doc: DocBridge;
    session: {
        load: () => Promise<Result<UiSession>>;
        save: (input: SessionSaveRequest) => Promise<Result<Empty>>;
    };
    menu: {
        /** The renderer owns the language preference, so it says which one the menu speaks. */
        speak: (input: MenuLanguageRequest) => Promise<Result<Empty>>;
        /** The document's history lives in the window, so the menu hands it the step to take. */
        onEditStep: (handler: (push: MenuEditPush) => void) => Unsubscribe;
        /** The Settings entry of the menu was clicked: the dialog lives here, so the menu asks for it. */
        onSettings: (handler: () => void) => Unsubscribe;
    };
    app: AppArea;
    window: {
        minimize: () => Promise<Result<Empty>>;
        toggleMaximize: () => Promise<Result<Empty>>;
        close: () => Promise<Result<Empty>>;
        onMaximizedChange: (handler: (push: WindowMaximizedPush) => void) => Unsubscribe;
        /** The coordinates are the corner of the button that was clicked, in the window. */
        popupAppMenu: (input: WindowPopupMenuRequest) => Promise<Result<Empty>>;
        /** Starts the app over once what was being written has landed. */
        relaunch: () => Promise<Result<Empty>>;
        /** Says the window drew what it restored: main notes the moment in the log of the start. */
        ready: () => Promise<Result<Empty>>;
    };
    repo: RepoArea;
    conflict: ConflictArea;
    notice: NoticeArea;
    network: NetworkArea;
    scripts: ScriptsArea;
    update: UpdateArea;
    log: LogArea;
};
