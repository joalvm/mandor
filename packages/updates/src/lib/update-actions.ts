import { bridge, fireAndForget } from '@mandor/shell';

/**
 * What the person can ask of the updates. Main answers through the state it pushes, so a call
 * that fails shows up there and nothing here waits for it.
 */
export function downloadUpdate(): void {
    fireAndForget(bridge.update.download());
}

export function installUpdate(): void {
    fireAndForget(bridge.update.install());
}

export function openUpdatePage(): void {
    fireAndForget(bridge.update.openPage());
}
