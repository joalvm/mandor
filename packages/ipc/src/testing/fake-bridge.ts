import type { CoreBridge } from '../bridge/core-bridge.js';
import type { ConnectionArea } from '../connection/connection-area.js';
import type { JsonlExportArea } from '../export/export-jsonl.js';
import type { GraphqlArea } from '../graphql/graphql-area.js';
import type { CodegenArea } from '../codegen/codegen-area.js';
import type { ConflictChangedPush } from '../conflict/conflict-changed.js';
import type { CookiesArea } from '../cookies/cookies-area.js';
import type { HistoryArea } from '../history/history-area.js';
import type { RecordArea } from '../record/record-area.js';
import type { RequestArea } from '../request/request-area.js';
import type { WsArea } from '../ws/ws-area.js';
import type { WsActivityPush } from '../ws/ws-activity.js';
import type { WsScriptNote } from '../ws/ws-script-note.js';
import type { WsStatePush } from '../ws/ws-state.js';
import type { RecordStatePush } from '../record/record-state.js';
import type { NoticePush } from '../notice/notice-push.js';
import type { UpdateState } from '../update/update-state.js';
import type { MenuEditPush } from '../menu/menu-edit.js';
import type { OriginStatePush } from '../origin/origin-state.js';
import type { ConflictRecordedPush, RepoChangedPush } from '../repo/repo-changed.js';
import type { WindowMaximizedPush } from '../window/window-maximized.js';

import {
    type EditStepHandler,
    type MenuSettingsHandler,
    defaultMenu,
    defaultRepo,
    defaultWindow,
    type ConflictRecordedHandler,
    type MaximizedHandler,
    type RepoChangedHandler,
} from './bridge-chrome-defaults.js';
import {
    type ActivityHandler,
    type ScriptNoteHandler,
    type OriginStateHandler,
    defaultAuth,
    defaultCollections,
    defaultGlobals,
    defaultDoc,
    defaultEnvironment,
    defaultExport,
    defaultImport,
    defaultOrigin,
    defaultRecord,
    defaultSecret,
    defaultSession,
    type StateHandler,
    defaultWs,
} from './bridge-defaults.js';
import { defaultApp } from './default-app.js';
import { defaultConnection } from './default-connection.js';
import { defaultWorkspace } from './default-workspace.js';
import { defaultGraphql } from './default-graphql.js';
import { emitTo } from './emit-to.js';
import { defaultConflict, type ConflictChangedHandler } from './default-conflict.js';
import { defaultLog } from './default-log.js';
import { defaultNetwork } from './default-network.js';
import { defaultScripts } from './default-scripts.js';
import { defaultNotice, type NoticeRaisedHandler } from './default-notice.js';
import { defaultUpdate, type UpdateChangedHandler } from './default-update.js';
import { defaultCookies } from './default-cookies.js';
import { defaultHistory } from './default-history.js';
import { defaultRequest } from './default-request.js';
import { defaultCodegen } from './default-codegen.js';

/**
 * Every area a window of either app can reach: the core, and what each app adds to it. The
 * double answers them all, so one double serves the tests of both apps and of every package.
 */
export type WholeBridge = CoreBridge & {
    export: JsonlExportArea;
    connection: ConnectionArea;
    ws: WsArea;
    record: RecordArea;
    request: RequestArea;
    history: HistoryArea;
    graphql: GraphqlArea;
    cookies: CookiesArea;
    codegen: CodegenArea;
};

/** Per-area replacements. Overriding onState or onActivity disconnects the emit helpers. */
type FakeBridgeOverrides = {
    [Area in keyof WholeBridge]?: Partial<WholeBridge[Area]>;
};

/** The double, plus the doors main would push through. */
export type FakeBridge = WholeBridge & {
    emitState: (push: WsStatePush) => void;
    emitActivity: (push: WsActivityPush) => void;
    emitScriptNote: (note: WsScriptNote) => void;
    emitRecord: (push: RecordStatePush) => void;
    emitMaximized: (push: WindowMaximizedPush) => void;
    emitEditStep: (push: MenuEditPush) => void;
    emitMenuSettings: () => void;
    emitRepoChanged: (push: RepoChangedPush) => void;
    emitConflictRecorded: (push: ConflictRecordedPush) => void;
    emitOriginState: (push: OriginStatePush) => void;
    emitConflictChanged: (push: ConflictChangedPush) => void;
    emitNotice: (push: NoticePush) => void;
    emitUpdate: (state: UpdateState) => void;
};

/**
 * A bridge that answers with valid domain data and nothing more: no business logic, no
 * simulation of the app. It implements the whole contract, so a method added to an area
 * and not to this double stops the package from compiling.
 */
export function createFakeBridge(overrides: FakeBridgeOverrides = {}): FakeBridge {
    const stateHandlers = new Set<StateHandler>();
    const activityHandlers = new Set<ActivityHandler>();
    const noteHandlers = new Set<ScriptNoteHandler>();
    const recordHandlers = new Set<(push: RecordStatePush) => void>();
    const maximizedHandlers = new Set<MaximizedHandler>();
    const editStepHandlers = new Set<EditStepHandler>();
    const menuSettingsHandlers = new Set<MenuSettingsHandler>();
    const changedHandlers = new Set<RepoChangedHandler>();
    const conflictHandlers = new Set<ConflictRecordedHandler>();
    const originStateHandlers = new Set<OriginStateHandler>();
    const clashListHandlers = new Set<ConflictChangedHandler>();
    const noticeHandlers = new Set<NoticeRaisedHandler>();
    const updateHandlers = new Set<UpdateChangedHandler>();

    return {
        origin: { ...defaultOrigin(originStateHandlers), ...overrides.origin },
        workspace: { ...defaultWorkspace(), ...overrides.workspace },
        auth: { ...defaultAuth(), ...overrides.auth },
        globals: { ...defaultGlobals(), ...overrides.globals },
        collections: { ...defaultCollections(), ...overrides.collections },
        connection: { ...defaultConnection(), ...overrides.connection },
        import: { ...defaultImport(), ...overrides.import },
        environment: { ...defaultEnvironment(), ...overrides.environment },
        secret: { ...defaultSecret(), ...overrides.secret },
        export: { ...defaultExport(), ...overrides.export },
        doc: { ...defaultDoc(), ...overrides.doc },
        session: { ...defaultSession(), ...overrides.session },
        menu: { ...defaultMenu(editStepHandlers, menuSettingsHandlers), ...overrides.menu },
        app: { ...defaultApp(), ...overrides.app },
        window: { ...defaultWindow(maximizedHandlers), ...overrides.window },
        repo: { ...defaultRepo(changedHandlers, conflictHandlers), ...overrides.repo },
        conflict: { ...defaultConflict(clashListHandlers), ...overrides.conflict },
        notice: { ...defaultNotice(noticeHandlers), ...overrides.notice },
        network: { ...defaultNetwork(), ...overrides.network },
        scripts: { ...defaultScripts(), ...overrides.scripts },
        update: { ...defaultUpdate(updateHandlers), ...overrides.update },
        log: { ...defaultLog(), ...overrides.log },
        ws: { ...defaultWs(stateHandlers, activityHandlers, noteHandlers), ...overrides.ws },
        record: { ...defaultRecord(recordHandlers), ...overrides.record },
        request: { ...defaultRequest(), ...overrides.request },
        history: { ...defaultHistory(), ...overrides.history },
        graphql: { ...defaultGraphql(), ...overrides.graphql },
        cookies: { ...defaultCookies(), ...overrides.cookies },
        codegen: { ...defaultCodegen(), ...overrides.codegen },
        emitState: emitTo(stateHandlers),
        emitActivity: emitTo(activityHandlers),
        emitScriptNote: emitTo(noteHandlers),
        emitRecord: emitTo(recordHandlers),
        emitMaximized: emitTo(maximizedHandlers),
        emitRepoChanged: emitTo(changedHandlers),
        emitConflictRecorded: emitTo(conflictHandlers),
        emitConflictChanged: emitTo(clashListHandlers),
        emitNotice: emitTo(noticeHandlers),
        emitUpdate: emitTo(updateHandlers),
        emitOriginState: emitTo(originStateHandlers),
        emitEditStep: emitTo(editStepHandlers),
        emitMenuSettings: () => {
            for (const handler of menuSettingsHandlers) {
                handler();
            }
        },
    };
}

/**
 * The double on the window of a jsdom test: the setup installs one per worker and renews its areas
 * per file. A test emits through it or spies on it.
 */
export function windowBridge(): FakeBridge {
    const installed: unknown = Reflect.get(globalThis, 'mandor');

    if (!isFakeBridge(installed)) {
        throw new Error('The window has no bridge double: only the jsdom setup installs one.');
    }

    return installed;
}

/** The doors only the double has: main pushes through them, and a real bridge has none. */
function isFakeBridge(value: unknown): value is FakeBridge {
    return typeof value === 'object' && value !== null && 'emitNotice' in value;
}
