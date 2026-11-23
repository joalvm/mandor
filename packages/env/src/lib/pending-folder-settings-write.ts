import type { ErrorCode } from '@mandor/ipc';
import type {
    AuthConfig,
    FolderChainLevel,
    FolderChainSettings,
    RequestLine,
    RequestScripts,
} from '@mandor/schema';
import { bridge, createPendingWrites } from '@mandor/shell';

import { envStore } from '../env-store.js';
import { chainKey, reloadFolderChains } from './folder-chains.js';

/**
 * What a tab of a folder edits on its way to disk: `null` hands the auth back to the level above,
 * and takes the scripts out of the file once none is left.
 */
export type FolderSettingsEdit = {
    auth?: AuthConfig | null;
    headers?: RequestLine[];
    scripts?: RequestScripts | null;
};

type SettingsWrite = {
    workspaceId: string;
    path: string;
    edit: FolderSettingsEdit;
    onRefused: (code: ErrorCode) => void;
};

const PENDING = createPendingWrites<string, SettingsWrite>((key, write) => inTurn(key, write));

/** The last write of each group, so the next one waits for it to land. */
const LAST_WRITE = new Map<string, Promise<void>>();

/**
 * Shows the edit at once in the chain every field of the group reads, and writes it a moment
 * after the last key. What one pause gathers leaves as one patch. A refusal is told, and the
 * screen goes back to what the disk holds.
 */
export function scheduleFolderSettingsWrite(
    workspaceId: string,
    path: string,
    edit: FolderSettingsEdit,
    onRefused: (code: ErrorCode) => void,
): void {
    const key = chainKey(workspaceId, path);
    const gathered = { ...PENDING.waiting(key)?.edit, ...edit };

    showEdit(key, edit);
    PENDING.schedule(key, { workspaceId, path, edit: gathered, onRefused });
}

/**
 * One write at a time per group: two in flight can land the wrong way round and leave on disk a
 * value already typed over. A write that broke does not stop the ones after it.
 */
function inTurn(key: string, write: SettingsWrite): Promise<void> {
    const go = (): Promise<void> => writeNow(key, write);
    const turn = (LAST_WRITE.get(key) ?? Promise.resolve()).then(go, go).finally(() => {
        if (LAST_WRITE.get(key) === turn) {
            LAST_WRITE.delete(key);
        }
    });

    LAST_WRITE.set(key, turn);

    return turn;
}

async function writeNow(key: string, write: SettingsWrite): Promise<void> {
    const { workspaceId, path, edit, onRefused } = write;
    const result = await bridge.collections.writeSettings({
        workspaceId,
        path,
        patch: editForFile(edit),
    });

    if (!result.ok) {
        onRefused(result.error.code);
    }

    // Every item under the group reads a chain that holds it: they all hear the new values.
    await reloadFolderChains(workspaceId);

    // What was typed while this one landed is newer than the answer that just came back; and a
    // line half typed, which the file did not get, stays where it was being written.
    const onScreen = PENDING.waiting(key)?.edit ?? (result.ok ? edit : undefined);

    if (onScreen !== undefined) {
        showEdit(key, onScreen);
    }
}

/** A line half typed is what the user sees while writing it; the file gets the named ones. */
function editForFile(edit: FolderSettingsEdit): FolderSettingsEdit {
    if (edit.headers === undefined) {
        return edit;
    }

    return { ...edit, headers: edit.headers.filter((line) => line.key !== '') };
}

/** The first level of the chain of a group is the group itself: that is the one being edited. */
function showEdit(key: string, edit: FolderSettingsEdit): void {
    envStore.setState((state) => {
        const [own, ...above] = state.folderChains[key] ?? [];

        if (own === undefined) {
            return {};
        }

        const edited: FolderChainLevel = { ...own, settings: editedSettings(own.settings, edit) };

        return { folderChains: { ...state.folderChains, [key]: [edited, ...above] } };
    });
}

function editedSettings(
    settings: FolderChainSettings,
    edit: FolderSettingsEdit,
): FolderChainSettings {
    const { auth, scripts, ...rest } = { ...settings, ...edit };

    return {
        ...rest,
        ...(auth ? { auth } : {}),
        ...(scripts ? { scripts } : {}),
    };
}
