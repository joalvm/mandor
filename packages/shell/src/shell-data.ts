import { initialConflictsSlice, type ConflictsSlice } from './conflicts.slice.js';
import { initialNoticesSlice, type NoticesSlice } from './notices.slice.js';
import { initialOriginsSlice, type OriginsSlice } from './origins.slice.js';
import { initialUiSlice, type UiSlice } from './ui.slice.js';
import { initialWorkspaceSlice, type WorkspaceSlice } from './workspace.slice.js';

export type ShellData = ConflictsSlice & NoticesSlice & OriginsSlice & UiSlice & WorkspaceSlice;

export function initialShellData(): ShellData {
    return {
        ...initialConflictsSlice(),
        ...initialNoticesSlice(),
        ...initialOriginsSlice(),
        ...initialWorkspaceSlice(),
        ...initialUiSlice(),
    };
}
