export { AppIcon } from './components/title-bar/AppIcon.js';
export { AppMenuButton } from './components/title-bar/AppMenuButton.js';
export { CommandCenter } from './components/title-bar/CommandCenter.js';
export { CommandPalette } from './components/command-palette/CommandPalette.js';
export { GroupGrid } from './components/group-grid/GroupGrid.js';
export { OriginSwitching } from './components/overlay/OriginSwitching.js';
export { UnsavedChangesDialog } from './components/overlay/UnsavedChangesDialog.js';
export { Sidebar } from './components/sidebar/Sidebar.js';
export { SidebarResizer } from './components/sidebar/SidebarResizer.js';
export { StatusLine } from './components/status-line/StatusLine.js';
export { ConsoleDock } from './components/console/ConsoleDock.js';
export { consoleStore, showConsole, writeConsole } from './console/console-store.js';
export { WindowControls } from './components/title-bar/WindowControls.js';

/** The one reading of the bridge in the renderer: the core every app exposes. */
export { bridge } from './bridge.js';
export { fireAndForget } from './fire-and-forget.js';
export { FaultBoundary } from './components/fault/FaultBoundary.js';
export { rootErrorOptions, watchRendererFaults } from './fault/root-error-options.js';
export {
    availableCommands,
    registerCommand,
    registeredCommands,
    type Command,
} from './command/command-registry.js';
export { registerShellCommands } from './command/register-shell-commands.js';
export { registerSurface, windowSurface } from './command/window-surface.js';
export { originName } from './origin-name.js';
export { dropOriginState, onOriginLeft, scopeToOrigin } from './origin/origin-scope.js';
export type { SearchEntry, SearchField, WorkspaceEntries } from './search/search-entry.js';
export { useMenuEditSteps } from './hooks/useMenuEditSteps.js';
export { useMenuLanguage } from './hooks/useMenuLanguage.js';
export { useMenuSettings } from './hooks/useMenuSettings.js';
export { useWindowReady } from './hooks/useWindowReady.js';
export { useResourceSection } from './hooks/useResourceSection.js';
export { useShellStore } from './hooks/useShellStore.js';
export { useSplit } from './hooks/useSplit.js';
export { useUnfoldSection } from './hooks/useUnfoldSection.js';
export { useFailureToast } from './hooks/useFailureToast.js';
export { useRepoChanged } from './hooks/useRepoChanged.js';
export { useShortcuts } from './hooks/useShortcuts.js';
export { movedResource } from './resource/resource-move.js';
export { registerResourceMove } from './resource/resource-move-registry.js';
export { syncNoticeOf, type SyncNotice } from './sync-notice.js';
export { createPendingWrites, settlePendingWrites } from './writes/pending-writes.js';
export { createLatestRead } from './repo/latest-read.js';
export { saveOnClose } from './writes/save-on-close.js';
export { selectConflictFor, selectConflicts } from './conflicts.slice.js';
export { conflictIdOf, conflictResource, conflictTabId } from './conflict/conflict-resource.js';
export { openConflict } from './conflict/open-conflict.js';
export {
    selectActiveGroup,
    selectActiveTabId,
    selectGroupOfTab,
    selectOpenResources,
    selectResourceOfTab,
    selectSection,
    selectTabShown,
    selectTabs,
} from './selectors.js';
export { shellStore, type ShellStore } from './shell-store.js';
export { DEFAULT_SHORTCUTS } from './shortcut/default-shortcuts.js';
export { isApplePlatform } from './shortcut/apple-platform.js';
export { shortcutLabel } from './shortcut/shortcut-label.js';
export { SidebarSection } from './components/sidebar/SidebarSection.js';
export { SidebarSectionActions } from './components/sidebar/SidebarSectionActions.js';
export { SidebarSectionBody } from './components/sidebar/SidebarSectionBody.js';
export { SidebarSearch } from './components/sidebar/SidebarSearch.js';
export { SidebarSearchField } from './components/sidebar/SidebarSearchField.js';
export { SidebarSearchResults } from './components/sidebar/SidebarSearchResults.js';
export { useSidebarSearchField } from './hooks/useSidebarSearchField.js';
export { focusSidebarSearch } from './search/sidebar-search-registry.js';
export { setSidebarSearchQuery, useSidebarSearchQuery } from './search/sidebar-search-query.js';
export { NoticeFeed } from './components/notice-center/NoticeFeed.js';
export { NoticeCenterItem } from './components/notice-center/NoticeCenterItem.js';
export { recordNotice } from './record-notice.js';
export { StatusItem } from './components/status-line/StatusItem.js';
export { useStatusItems } from './status/status-item-registry.js';
export { TabBody } from './components/tab-kind/TabBody.js';
export { TabIndicator } from './components/tab-kind/TabIndicator.js';
export { TabKind } from './components/tab-kind/TabKind.js';
export { TabStatus } from './components/tab-kind/TabStatus.js';
export { useKeepTab, useTab } from './hooks/useTab.js';
export { useTabOpened } from './hooks/useTabOpened.js';
export { tabKind, tabKindOf, type TabSaveOutcome } from './tab/tab-kind-registry.js';
export { createDeclarations, type Declared } from './declare/declarations.js';
export { useDeclared, useDeclaredList } from './declare/useDeclared.js';
export { useDeclaredPart } from './declare/useDeclaredPart.js';
export { useDeclaration } from './declare/useDeclaration.js';
export { TabProvider } from './tab/tab-context.js';
export { shownTabId } from './tab/shown-tab-id.js';
export { EmptyGroup } from './components/group-grid/EmptyGroup.js';
export { TabStripAction } from './components/tab-strip/TabStripAction.js';
export { useTabStrip } from './hooks/useTabStrip.js';
export type { Tab } from './tab/tab.js';
