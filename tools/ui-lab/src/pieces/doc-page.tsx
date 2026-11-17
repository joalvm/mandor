import { useContext, useRef, type PropsWithChildren } from 'react';

import { PageOutline } from './page-outline.js';
import { PageSection } from './page-section.js';

/** Prosa en una columna de lectura; las páginas de bocetos, con demos anchas, en una mayor. */
type PageWidth = 'prose' | 'wide';

const WIDTH_CLASSES: Record<PageWidth, string> = {
    prose: 'max-w-3xl',
    wide: 'max-w-5xl',
};

type DocPageProps = PropsWithChildren<{
    title: string;
    lead: string;
    width?: PageWidth;
}>;

/**
 * Página de documentación del lab, escrita como una web: la sección encima del titular, la
 * entradilla a tamaño de lectura y las secciones con aire entre ellas. El mismo esqueleto para
 * todas: lo que cambia es el contenido.
 */
export function DocPage({ children, lead, title, width = 'prose' }: DocPageProps) {
    const section = useContext(PageSection);
    const article = useRef<HTMLElement>(null);

    return (
        <div className="mx-auto flex w-full max-w-7xl justify-center gap-16 px-10 pt-12 pb-24">
            <article
                className={`flex min-w-0 flex-1 flex-col gap-14 ${WIDTH_CLASSES[width]}`}
                ref={article}
            >
                <header className="flex flex-col gap-3 border-b border-border-subtle pb-10">
                    <p className="text-sm font-semibold text-text-accent">{section}</p>
                    <h1 className="text-lab-display font-semibold text-text-primary">{title}</h1>
                    <p className="max-w-2xl text-lab-lead text-text-secondary">{lead}</p>
                </header>
                {children}
            </article>
            <PageOutline article={article} />
        </div>
    );
}
