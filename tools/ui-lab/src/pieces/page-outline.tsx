import { useEffect, useState, type RefObject } from 'react';

type OutlineEntry = { depth: 'section' | 'demo'; id: string; label: string };

const DEPTH: Record<string, OutlineEntry['depth']> = { H2: 'section', H3: 'demo' };

const DEPTH_CLASSES: Record<OutlineEntry['depth'], string> = {
    demo: 'pl-3',
    section: '',
};

/** Los títulos con ancla de la página, en orden: secciones y, debajo, sus demos. */
function entriesOf(article: HTMLElement): OutlineEntry[] {
    return [...article.querySelectorAll<HTMLElement>('h2[id], h3[id]')].map((heading) => ({
        depth: DEPTH[heading.tagName] ?? 'section',
        id: heading.id,
        label: heading.textContent,
    }));
}

/**
 * El índice de la página, a la derecha, como en una web de documentación. Lee los títulos que la
 * página ya pintó; una página sin títulos con ancla no lo muestra.
 */
export function PageOutline({ article }: { article: RefObject<HTMLElement | null> }) {
    const [entries, setEntries] = useState<OutlineEntry[]>([]);

    useEffect(() => {
        if (article.current !== null) {
            setEntries(entriesOf(article.current));
        }
    }, [article]);

    if (entries.length === 0) {
        return null;
    }

    return (
        <nav
            aria-label="En esta página"
            className="sticky top-12 hidden max-h-[calc(100dvh-8rem)] w-56 shrink-0 flex-col gap-2 self-start overflow-y-auto xl:flex"
        >
            <p className="text-xs font-semibold text-text-secondary">En esta página</p>
            <ul className="flex flex-col gap-1 border-l border-border-subtle pl-3">
                {entries.map((entry) => (
                    <li className={DEPTH_CLASSES[entry.depth]} key={entry.id}>
                        <a
                            className="block rounded-sm py-0.5 text-sm text-text-secondary hover:text-text-primary"
                            data-focus-ring=""
                            href={`#${entry.id}`}
                            onClick={(event) => {
                                event.preventDefault();
                                document
                                    .getElementById(entry.id)
                                    ?.scrollIntoView({ block: 'start' });
                            }}
                        >
                            {entry.label}
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
