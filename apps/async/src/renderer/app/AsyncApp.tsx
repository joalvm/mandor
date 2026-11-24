// The two windows share a shape and the pieces it is drawn with today, and are free to stop
// sharing them.
// jscpd:ignore-start
import { WorkspaceCollection } from '@mandor/collections';
import { DocCommands, WorkspaceDocs } from '@mandor/docs';
import { ManagedEnvironments, ScriptVariableCommands } from '@mandor/env';
import { onImported } from '@mandor/exchange';
import { useMessages } from '@mandor/i18n';
import { openSettings, SettingsDialog } from '@mandor/prefs';
import { ConflictToasts, openOriginsTab, useOriginBoot } from '@mandor/repos';
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

import { WorkspaceConnections } from '../features/connections/index.js';
import { switchAsyncOriginTo } from './switch-origin.js';
import { AsyncPanelActions } from './AsyncPanelActions.js';
import { AsyncSidebarSections } from './AsyncSidebarSections.js';
import { AsyncTabKinds } from './AsyncTabKinds.js';
import { AsyncTitleBar } from './AsyncTitleBar.js';

/**
 * The window of Mandor Realtime, written out: the rows of the shell, and inside each row the piece
 * of this app that fills it.
 *
 * It is a tree and not a set of slots handed to a frame. The two apps share the shape of a
 * window today and are free to stop sharing it — a zone that arrives here as a prop would make
 * that a change to the frame both of them draw, instead of a change to this file alone.
 */
export function AsyncApp() {
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
                <AsyncTabKinds />
                <AsyncSidebarSections />
                <AsyncPanelActions />
                <ConflictToasts />
                <NoticeFeed />
                <NoticeCenterItem />
                <DocCommands />
                <ManagedEnvironments />
                <ScriptVariableCommands />
                <WorkspaceCollection />
                <WorkspaceDocs />
                <WorkspaceConnections reloadWhen={onImported} />
                <AppShell>
                    <AsyncTitleBar
                        onManageOrigins={openOriginsTab}
                        onManageWorkspaces={openWorkspacesTab}
                        onOpenSettings={() => {
                            openSettings();
                        }}
                        onSwitchOrigin={(id) => {
                            fireAndForget(switchAsyncOriginTo(id));
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
