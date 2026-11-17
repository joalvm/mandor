import { cleanup, render, renderHook } from '@testing-library/react';
import { use } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { SidebarSectionIdContext } from '../../../src/components/sidebar/sidebar-section-context.js';
import { SidebarSection, SidebarSectionActions, SidebarSectionBody } from '../../../src/index.js';
import {
    sidebarSectionDeclarations,
    sidebarSectionsInOrder,
} from '../../../src/sidebar/sidebar-section-registry.js';

const DOCS = { id: 'docs', order: 20, title: 'docs:heading' } as const;

const CONNECTIONS = {
    id: 'connections',
    order: 10,
    title: 'connections:heading',
} as const;

function SectionId() {
    return <output>{use(SidebarSectionIdContext)}</output>;
}

afterEach(() => {
    cleanup();
});

describe('a section declared in the tree', () => {
    it('hands its logic, its body and its actions to the registry while it is mounted', () => {
        const view = render(
            <SidebarSection {...DOCS}>
                <SidebarSectionActions>
                    <button type="button">Nuevo</button>
                </SidebarSectionActions>
                <SidebarSectionBody>
                    <span>guía</span>
                </SidebarSectionBody>
            </SidebarSection>,
        );
        const declared = sidebarSectionDeclarations.get('docs');

        expect(declared).toMatchObject(DOCS);
        expect(declared?.body).toEqual(<span>guía</span>);
        expect(declared?.actions).toEqual(<button type="button">Nuevo</button>);

        view.unmount();

        expect(sidebarSectionDeclarations.get('docs')).toBeUndefined();
    });

    it('gives its parts the id of the section they sit in', () => {
        const view = render(
            <SidebarSection {...CONNECTIONS}>
                <SectionId />
            </SidebarSection>,
        );

        expect(view.container).toHaveTextContent('connections');
    });

    it('is listed in the order each section asked for, not the order they mounted', () => {
        render(
            <>
                <SidebarSection {...DOCS} />
                <SidebarSection {...CONNECTIONS} />
            </>,
        );

        expect(
            sidebarSectionsInOrder(sidebarSectionDeclarations.list()).map(({ id }) => id),
        ).toEqual(['connections', 'docs']);
    });

    it('refuses a part written outside a section', () => {
        expect(() => {
            renderHook(() => SidebarSectionBody({ children: null }));
        }).toThrow('A sidebar section body is declared inside a SidebarSection.');
    });
});
