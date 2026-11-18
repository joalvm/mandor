import type { LabGroup, LabPage } from './nav/lab-page.js';

import { BLOCKS } from './nav/pages-blocks.js';
import { CONTROLES } from './nav/pages-components.js';
import { FOUNDATIONS } from './nav/pages-foundations.js';

export type { LabGroup, LabPage } from './nav/lab-page.js';

export { FOUNDATIONS } from './nav/pages-foundations.js';

const FOUNDATIONS_GROUP: LabGroup = {
    label: 'Fundamentos',
    pages: FOUNDATIONS,
    root: 'foundations',
};

export const LAB_GROUPS: readonly LabGroup[] = [
    FOUNDATIONS_GROUP,
    { label: 'Componentes', pages: CONTROLES, root: 'components' },
    { label: 'Bloques', pages: BLOCKS, root: 'blocks' },
];

export const ALL_PAGES: readonly LabPage[] = LAB_GROUPS.flatMap((group) => group.pages);

/** La sección de una página; los fundamentos si la página no cuelga de ninguna. */
export function groupOf(pageId: string): LabGroup {
    return (
        LAB_GROUPS.find((candidate) => candidate.pages.some((entry) => entry.id === pageId)) ??
        FOUNDATIONS_GROUP
    );
}
