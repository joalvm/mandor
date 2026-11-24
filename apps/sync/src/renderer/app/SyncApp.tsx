// The two windows share a shape and the pieces it is drawn with today, and are free to stop
// sharing them.
// jscpd:ignore-start
import { WorkspaceCollection } from '@mandor/collections';
import { DocCommands, WorkspaceDocs } from '@mandor/docs';
import { ManagedEnvironments, ScriptVariableCommands } from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { openSettings, SettingsDialog } from '@mandor/prefs';
import { ConflictToasts, openOriginsTab, switchOriginTo, useOriginBoot } from '@mandor/repos';
import {
    CommandPalette,
    ConsoleDock,
    fireAndForget,
    GroupGrid,
    OriginSwitching,
    UnsavedChangesDialog,
    NoticeCenterItem,
    NoticeFeed,
    recordNotice,
    Sidebar,
    SidebarResizer,
    StatusLine,
    useMenuEditSteps,
    useMenuLanguage,
    useMenuSettings,
    useShellStore,
    useShortcuts,
    useWindowConsole,
    useWindowReady,
} from '@mandor/shell';
import {
    AppBody,
    AppShell,
    SidePanel,
    StatusBar,
    ToastProvider,
    TooltipProvider,
    Workbench,
} from '@mandor/ui';
import { adoptOrigin, openWorkspacesTab } from '@mandor/workspace';

import { SyncPanelActions } from './SyncPanelActions.js';
import { SyncSidebarSections } from './SyncSidebarSections.js';
import { SyncTabKinds } from './SyncTabKinds.js';
import { SyncTitleBar } from './SyncTitleBar.js';

/**
 * The window of Mandor Request, written out: the rows of the shell, and inside each row the piece
 * of this app that fills it.
 *
 * It is a tree and not a set of slots handed to a frame. The environment of the workspace is
 * chosen in the title bar, beside the origin: the strip of tabs holds only tabs.
 */
export function SyncApp() {
    const messages = useMessages('shell');
    const sidebarWidth = useShellStore((state) => state.panels.sidebarWidth);

    useOriginBoot(adoptOrigin);
    useShortcuts();
    useMenuLanguage();
    useMenuEditSteps();
    useMenuSettings();
    useWindowReady();
    useWindowConsole();

    return (
        <TooltipProvider>
            <ToastProvider
                onNotify={recordNotice}
                messages={{
                    close: messages('toastClose'),
                    more: (count: number) => messages('toastMore', { count }),
                }}
            >
                <SyncTabKinds />
                <SyncSidebarSections />
                <SyncPanelActions />
                <ConflictToasts />
                <NoticeFeed />
                <NoticeCenterItem />
                <DocCommands />
                <ManagedEnvironments />
                <ScriptVariableCommands />
                <WorkspaceCollection />
                <WorkspaceDocs />
                <AppShell>
                    <SyncTitleBar
                        onManageOrigins={openOriginsTab}
                        onManageWorkspaces={openWorkspacesTab}
                        onOpenSettings={() => {
                            openSettings();
                        }}
                        onSwitchOrigin={(id) => {
                            fireAndForget(switchOriginTo(id, { adopt: adoptOrigin }));
                        }}
                    />
                    <AppBody>
                        <SidePanel width={sidebarWidth}>
                            <Sidebar />
                        </SidePanel>
                        <SidebarResizer />
                        <Workbench>
                            <ConsoleDock>
                                <GroupGrid />
                            </ConsoleDock>
                        </Workbench>
                    </AppBody>
                    <StatusBar>
                        <StatusLine />
                    </StatusBar>
                </AppShell>
                <OriginSwitching />
                <UnsavedChangesDialog />
                <CommandPalette />
                <SettingsDialog />
            </ToastProvider>
        </TooltipProvider>
    );
}
// jscpd:ignore-end
