import type {
    ScriptsApproveRequest,
    ScriptsStatusRequest,
    ScriptStatus,
} from '../script/scripts-approval.js';
import type { Empty, Result } from '../result/result.js';

/**
 * What the window says to main about the scripts of this machine: approve one, ask which are
 * approved, forget every approval, read or flip the switch that stops them all, and forget what
 * scripts set in a workspace. Main puts the origin and hashes the text; the window never names
 * either.
 */
export type ScriptsArea = {
    approve: (request: ScriptsApproveRequest) => Promise<Result<{ approved: boolean }>>;
    status: (request: ScriptsStatusRequest) => Promise<Result<{ statuses: ScriptStatus[] }>>;
    forget: () => Promise<Result<Empty>>;
    readSwitch: () => Promise<Result<{ enabled: boolean }>>;
    writeSwitch: (enabled: boolean) => Promise<Result<Empty>>;
    clearVariables: (workspaceId: string) => Promise<Result<Empty>>;
};
