import { SearchInput } from '@mandor/ui';
import { useState, type KeyboardEvent } from 'react';

import { LAB_GROUPS } from '../nav.js';

type SearchHit = {
    group: string;
    hash: string;
    label: string;
};

/** Una entrada por página de la web, con su sección para leerla al lado del resultado. */
const HITS: readonly SearchHit[] = LAB_GROUPS.flatMap((group) =>
    group.pages.map((page) => ({
        group: group.label,
        hash: `#/${group.root}/${page.id}`,
        label: page.label,
    })),
);

function hitsFor(needle: string): SearchHit[] {
    const normalized = needle.trim().toLocaleLowerCase();

    if (normalized === '') {
        return [];
    }

    return HITS.filter((hit) => hit.label.toLocaleLowerCase().includes(normalized));
}

/**
 * The search of the whole web, centred in the header: every page of every section, found by
 * name, with its section written beside it. The arrows walk the results, Enter opens one and
 * Escape empties the field. The keys are heard in capture, before the editable line takes the
 * event for its own caret, and the results stand on an anchor apiece so navigation is the
 * browser's, not code.
 */
export function ShellSearch() {
    const [needle, setNeedle] = useState('');
    const [held, setHeld] = useState(false);
    const [active, setActive] = useState(0);
    const hits = hitsFor(needle);
    const activeIndex = Math.min(active, Math.max(0, hits.length - 1));
    const chosen = hits[activeIndex];
    const open = held && needle.trim() !== '';

    /** Vacía el campo soltando antes el foco: la línea editada no repinta mientras lo tiene. */
    function empty(): void {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        setNeedle('');
        setActive(0);
    }

    function go(hit: SearchHit | undefined): void {
        if (hit !== undefined) {
            location.hash = hit.hash;
        }

        empty();
    }

    function onKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
        if (event.key === 'Escape') {
            empty();

            return;
        }

        if (open && hits.length > 0) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => (index + 1) % hits.length);
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => (index - 1 + hits.length) % hits.length);
            }

            if (event.key === 'Enter') {
                go(chosen);
            }
        }
    }

    return (
        <div
            className="relative w-full max-w-md"
            data-part="shell-search"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setHeld(false);
                }
            }}
            onFocus={() => {
                setHeld(true);
            }}
            onKeyDownCapture={onKeyDown}
        >
            <SearchInput
                label="Buscar"
                onValueChange={(value) => {
                    setNeedle(value);
                    setActive(0);
                }}
                placeholder="Buscar"
                value={needle}
            />
            {open ? (
                <div
                    aria-label="Resultados"
                    className="absolute inset-x-0 top-full z-popover mt-gap-tight flex max-h-80 flex-col overflow-y-auto rounded-md border border-border-subtle bg-surface-panel py-gap-tight shadow-popover"
                    data-part="shell-search-hits"
                    role="listbox"
                >
                    {hits.length === 0 ? (
                        <p className="px-pad-control py-gap-control text-sm text-text-secondary">
                            Sin resultados
                        </p>
                    ) : (
                        hits.map((hit, index) => {
                            const marked = index === activeIndex;

                            return (
                                <a
                                    aria-selected={marked}
                                    className={`flex h-control shrink-0 items-center gap-gap-control px-pad-control text-sm ${
                                        marked
                                            ? 'bg-surface-selected text-text-primary'
                                            : 'text-text-secondary hover:bg-surface-control-hover'
                                    }`}
                                    data-focus-ring=""
                                    href={hit.hash}
                                    key={hit.hash}
                                    onClick={() => {
                                        go(hit);
                                    }}
                                    onMouseDown={(event) => {
                                        event.preventDefault();
                                    }}
                                    role="option"
                                >
                                    <span className="truncate">{hit.label}</span>
                                    <span className="ml-auto shrink-0 text-2xs text-text-secondary">
                                        {hit.group}
                                    </span>
                                </a>
                            );
                        })
                    )}
                </div>
            ) : null}
        </div>
    );
}
