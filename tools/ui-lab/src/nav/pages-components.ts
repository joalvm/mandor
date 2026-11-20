import type { LabPage } from './lab-page.js';

import { AddressBarPage } from '../components/address-bar/address-bar-page.js';
import { BadgePage } from '../components/badge/badge-page.js';
import { ButtonPage } from '../components/button/button-page.js';
import { CardPage } from '../components/card/card-page.js';
import { CheckboxPage } from '../components/checkbox/checkbox-page.js';
import { CodeEditorPage } from '../components/code-editor/code-editor-page.js';
import { CollapsiblePage } from '../components/collapsible/collapsible-page.js';
import { ContextMenuPage } from '../components/context-menu/context-menu-page.js';
import { DialogPage } from '../components/dialog/dialog-page.js';
import { FieldPage } from '../components/field/field-page.js';
import { HexViewPage } from '../components/hex-view/hex-view-page.js';
import { HoverCardPage } from '../components/hover-card/hover-card-page.js';
import { IconButtonPage } from '../components/icon-button/icon-button-page.js';
import { InlineNameInputPage } from '../components/inline-name-input/inline-name-input-page.js';
import { InputPage } from '../components/input/input-page.js';
import { ListRowPage } from '../components/list-row/list-row-page.js';
import { MenuPage } from '../components/menu/menu-page.js';
import { MethodMarkPage } from '../components/method-mark/method-mark-page.js';
import { PanelPage } from '../components/panel/panel-page.js';
import { PopoverPage } from '../components/popover/popover-page.js';
import { SchemaPanePage } from '../components/schema-pane/schema-pane-page.js';
import { SearchInputPage } from '../components/search-input/search-input-page.js';
import { SelectPage } from '../components/select/select-page.js';
import { SettingsGroupPage } from '../components/settings-group/settings-group-page.js';
import { SplitPanePage } from '../components/split-pane/split-pane-page.js';
import { StatusDotPage } from '../components/status-dot/status-dot-page.js';
import { SuggestListPage } from '../components/suggest-list/suggest-list-page.js';
import { SwitchPage } from '../components/switch/switch-page.js';
import { TablePage } from '../components/table/table-page.js';
import { TabsPage } from '../components/tabs/tabs-page.js';
import { ToastPage } from '../components/toast/toast-page.js';
import { TooltipPage } from '../components/tooltip/tooltip-page.js';
import { TreePage } from '../components/tree/tree-page.js';

/**
 * Los componentes del sistema, en orden alfabético: quien busca sabe dónde está cada uno y una
 * tanda nueva entra en su sitio, no al final.
 */
export const CONTROLES: readonly LabPage[] = [
    { component: AddressBarPage, icon: 'send', id: 'address-bar', label: 'AddressBar' },
    { component: BadgePage, icon: 'info', id: 'badge', label: 'Badge' },
    { component: ButtonPage, icon: 'send', id: 'button', label: 'Button' },
    { component: CardPage, icon: 'doc', id: 'card', label: 'Card' },
    { component: CheckboxPage, icon: 'check', id: 'checkbox', label: 'Checkbox' },
    { component: CodeEditorPage, icon: 'edit', id: 'code-editor', label: 'CodeEditor' },
    {
        component: CollapsiblePage,
        icon: 'chevron-right',
        id: 'collapsible',
        label: 'Collapsible',
    },
    {
        component: ContextMenuPage,
        icon: 'more-horizontal',
        id: 'context-menu',
        label: 'ContextMenu',
    },
    { component: DialogPage, icon: 'window-maximize', id: 'dialog', label: 'Dialog' },
    { component: FieldPage, icon: 'wrap-text', id: 'field', label: 'Field' },
    { component: HexViewPage, icon: 'zoom-in', id: 'hex-view', label: 'HexView' },
    { component: HoverCardPage, icon: 'eye', id: 'hover-card', label: 'HoverCard' },
    { component: IconButtonPage, icon: 'more-vertical', id: 'icon-button', label: 'IconButton' },
    {
        component: InlineNameInputPage,
        icon: 'rename',
        id: 'inline-name-input',
        label: 'InlineNameInput',
    },
    { component: InputPage, icon: 'edit', id: 'input', label: 'Input' },
    { component: ListRowPage, icon: 'menu', id: 'list-row', label: 'ListRow' },
    { component: MenuPage, icon: 'menu', id: 'menu', label: 'Menu' },
    { component: MethodMarkPage, icon: 'http', id: 'method-mark', label: 'MethodMark' },
    { component: PanelPage, icon: 'panel-maximize', id: 'panel', label: 'Panel' },
    { component: PopoverPage, icon: 'workspace', id: 'popover', label: 'Popover' },
    { component: SchemaPanePage, icon: 'format', id: 'schema-pane', label: 'SchemaPane' },
    { component: SearchInputPage, icon: 'search', id: 'search-input', label: 'SearchInput' },
    { component: SelectPage, icon: 'chevron-down', id: 'select', label: 'Select' },
    {
        component: SettingsGroupPage,
        icon: 'settings',
        id: 'settings-group',
        label: 'SettingsGroup',
    },
    { component: SplitPanePage, icon: 'split-vertical', id: 'split-pane', label: 'SplitPane' },
    { component: StatusDotPage, icon: 'connect', id: 'status-dot', label: 'StatusDot' },
    { component: SuggestListPage, icon: 'filter', id: 'suggest-list', label: 'SuggestList' },
    { component: SwitchPage, icon: 'settings', id: 'switch', label: 'Switch' },
    { component: TablePage, icon: 'headers', id: 'table', label: 'Table' },
    { component: TabsPage, icon: 'window-restore', id: 'tabs', label: 'Tabs' },
    { component: ToastPage, icon: 'message', id: 'toast', label: 'Toast' },
    { component: TooltipPage, icon: 'info', id: 'tooltip', label: 'Tooltip' },
    { component: TreePage, icon: 'folder', id: 'tree', label: 'Tree' },
];
