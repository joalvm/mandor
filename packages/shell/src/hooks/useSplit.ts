import { useShellStore } from './useShellStore.js';
import { shellStore } from '../shell-store.js';

/**
 * Where the line of a split sits, remembered by workspace and kind of surface: closing a tab and
 * opening another of the same kind finds the line where the reader left it. The session belongs to
 * the app and the origin, so the rest of what tells two places apart comes with it. What a panel
 * too small for the line draws is the panel's to limit: it never overwrites what is remembered.
 */
export function useSplit(surface: string, initial: number): [number, (value: number) => void] {
    const key = useShellStore((state) => `${state.activeWorkspaceId ?? ''}/${surface}`);
    const value = useShellStore((state) => state.panels.splits[key] ?? initial);

    function setValue(next: number): void {
        const { panels, setPanels } = shellStore.getState();

        setPanels({ splits: { ...panels.splits, [key]: next } });
    }

    return [value, setValue];
}
