import type { IconName } from '@mandor/icons';
import type { ComponentType } from 'react';

/** Una entrada por página, en el mismo orden que la barra lateral. */
export type LabPage = {
    component: ComponentType;
    /** El glifo del lateral, del mismo juego que pinta el producto. */
    icon: IconName;
    id: string;
    label: string;
};

/** Una sección de la web: la pestaña de la barra y las páginas que su lateral lista. */
export type LabGroup = {
    label: string;
    pages: readonly LabPage[];
    /** La primera sección de la ruta: `#/foundations/color`. */
    root: string;
};
