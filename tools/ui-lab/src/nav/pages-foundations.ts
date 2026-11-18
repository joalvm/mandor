import type { LabPage } from './lab-page.js';

import { AlturasPage } from '../foundations/alturas/alturas-page.js';
import { CapasPage } from '../foundations/capas/capas-page.js';
import { ColorPrimitivasPage } from '../foundations/color-primitivas/color-primitivas-page.js';
import { ColorSemanticosPage } from '../foundations/color-semanticos/color-semanticos-page.js';
import { ElevacionPage } from '../foundations/elevacion/elevacion-page.js';
import { EspaciadoPage } from '../foundations/espaciado/espaciado-page.js';
import { FocoPage } from '../foundations/foco/foco-page.js';
import { IconografiaPage } from '../foundations/iconografia/iconografia-page.js';
import { MovimientoPage } from '../foundations/movimiento/movimiento-page.js';
import { OverviewPage } from '../foundations/overview/overview-page.js';
import { RadiosPage } from '../foundations/radios/radios-page.js';
import { TemaPage } from '../foundations/tema/tema-page.js';
import { TipografiaPage } from '../foundations/tipografia/tipografia-page.js';

export const FOUNDATIONS: readonly LabPage[] = [
    { component: OverviewPage, icon: 'doc', id: 'overview', label: 'Visión general' },
    {
        component: ColorPrimitivasPage,
        icon: 'format',
        id: 'color-primitivas',
        label: 'Color — primitivas',
    },
    {
        component: ColorSemanticosPage,
        icon: 'headers',
        id: 'color-semanticos',
        label: 'Color — semánticos',
    },
    { component: TemaPage, icon: 'color-mode', id: 'tema', label: 'Tema' },
    { component: TipografiaPage, icon: 'wrap-text', id: 'tipografia', label: 'Tipografía' },
    { component: AlturasPage, icon: 'split-vertical', id: 'alturas', label: 'Alturas' },
    { component: EspaciadoPage, icon: 'menu', id: 'espaciado', label: 'Espaciado' },
    { component: RadiosPage, icon: 'corner-radius', id: 'radios', label: 'Radios' },
    { component: ElevacionPage, icon: 'window-maximize', id: 'elevacion', label: 'Elevación' },
    { component: CapasPage, icon: 'window-restore', id: 'capas', label: 'Capas' },
    { component: MovimientoPage, icon: 'refresh', id: 'movimiento', label: 'Movimiento' },
    { component: FocoPage, icon: 'search', id: 'foco', label: 'Foco' },
    { component: IconografiaPage, icon: 'file', id: 'iconografia', label: 'Iconografía' },
];
