import { scopeToOrigin } from '@mandor/shell';
import { createStore } from 'zustand/vanilla';

type ManagedEnvironments = {
    /** The environment the dialog opens standing on, or nothing while it is closed. */
    environmentId: string | null;
    /** The workspace whose environments are being managed, or nothing while it is closed. */
    workspaceId: string | null;
};

export const managedEnvironmentsStore = scopeToOrigin(
    createStore<ManagedEnvironments>(() => ({
        environmentId: null,
        workspaceId: null,
    })),
);

/**
 * Opens the dialog of environments of one workspace. It is a function and not a component prop
 * because the request comes from anywhere: the title bar, the picker, the results of the search.
 * Who asks says which environment stands chosen when the dialog comes up.
 */
export function openManagedEnvironments(workspaceId: string, environmentId: string | null): void {
    managedEnvironmentsStore.setState({ environmentId, workspaceId });
}

export function closeManagedEnvironments(): void {
    managedEnvironmentsStore.setState({ environmentId: null, workspaceId: null });
}
