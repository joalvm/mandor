import { useStore } from 'zustand';

import { closeManagedEnvironments, managedEnvironmentsStore } from '../../managed-environments.js';
import { EnvironmentsDialog } from './EnvironmentsDialog.js';

/**
 * Draws the dialog of environments whenever something opened it from outside the tree that
 * mounts the picker. Mounted once by the window; closed is the dialog's own business.
 */
export function ManagedEnvironments() {
    const managed = useStore(managedEnvironmentsStore);

    if (managed.workspaceId === null) {
        return null;
    }

    return (
        <EnvironmentsDialog
            environmentId={managed.environmentId}
            onOpenChange={closeManagedEnvironments}
            open
            workspaceId={managed.workspaceId}
        />
    );
}
