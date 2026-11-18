import type { PropsWithChildren } from 'react';

import { LAB_GROUPS } from '../nav.js';
import { ShellSearch } from './shell-search.js';

type ShellHeaderProps = PropsWithChildren<{
    /** La sección abierta, que es la que su pestaña marca como activa. */
    activeRoot: string;
}>;

type SectionState = 'current' | 'rest';

/** La sección abierta lleva el texto pleno y la raya de acento pegada al borde de la cabecera. */
const SECTION_CLASSES: Record<SectionState, string> = {
    current:
        'font-semibold text-text-primary after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:bg-solid-accent',
    rest: 'text-text-secondary hover:text-text-primary',
};

const SECTION_CURRENT: Record<SectionState, 'page' | undefined> = {
    current: 'page',
    rest: undefined,
};

const HOME = `#/${LAB_GROUPS[0]?.root ?? ''}/${LAB_GROUPS[0]?.pages[0]?.id ?? ''}`;

/**
 * The header row of the platform, written like the top bar of a documentation site: the product
 * name, the three sections as text links with the open one underlined, and the search and
 * whatever the app nests at the far end — the lab mounts its theme menu there.
 */
export function ShellHeader({ activeRoot, children }: ShellHeaderProps) {
    return (
        <header
            className="flex h-16 items-center gap-10 border-b border-border-subtle bg-surface-app px-6"
            data-part="shell-header"
        >
            <a className="flex items-baseline gap-2 rounded-md" data-focus-ring="" href={HOME}>
                <span className="text-lab-lead font-semibold text-text-primary">Mandor</span>
                <span className="text-md text-text-secondary">Sistema de diseño</span>
            </a>
            <nav
                aria-label="Secciones"
                className="flex h-full items-stretch gap-7"
                data-part="shell-sections"
            >
                {LAB_GROUPS.map((group) => {
                    const state: SectionState = group.root === activeRoot ? 'current' : 'rest';

                    return (
                        <a
                            aria-current={SECTION_CURRENT[state]}
                            className={`relative flex items-center text-md ${SECTION_CLASSES[state]}`}
                            data-focus-ring=""
                            href={`#/${group.root}/${group.pages[0]?.id ?? ''}`}
                            key={group.root}
                        >
                            {group.label}
                        </a>
                    );
                })}
            </nav>
            <div className="ml-auto flex items-center gap-3">
                <div className="w-72">
                    <ShellSearch />
                </div>
                {children}
            </div>
        </header>
    );
}
