import type { LabPage } from './lab-page.js';

import { AuthPage } from '../blocks/auth/auth-page.js';
import { BlocksOverviewPage } from '../blocks/overview/blocks-page.js';
import { ExchangePage } from '../blocks/exchange/exchange-page.js';
import { KeyValuePage } from '../blocks/key-value/key-value-page.js';
import { SettingsPage } from '../blocks/settings/settings-page.js';

/**
 * Los bloques: composiciones que arman la ventana. Llegan con su plan; hasta entonces la
 * sección abre con su índice acordado.
 */
export const BLOCKS: readonly LabPage[] = [
    {
        component: BlocksOverviewPage,
        icon: 'sidebar-left',
        id: 'blocks-overview',
        label: 'Visión general',
    },
    {
        component: KeyValuePage,
        icon: 'filter',
        id: 'blocks-key-value',
        label: 'Tabla clave-valor',
    },
    {
        component: ExchangePage,
        icon: 'import',
        id: 'blocks-exchange',
        label: 'Importar y exportar',
    },
    {
        component: AuthPage,
        icon: 'key',
        id: 'blocks-auth',
        label: 'Auth',
    },
    {
        component: SettingsPage,
        icon: 'settings',
        id: 'blocks-settings',
        label: 'Ajustes',
    },
];
