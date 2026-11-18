import type { PropsWithChildren } from 'react';

import { slugOf } from './slug.js';

type DocSectionProps = PropsWithChildren<{
    heading: string;
    intent?: string;
}>;

/** Una sección de página: título, una línea de qué hay que mirar, y el contenido. */
export function DocSection({ heading, intent, children }: DocSectionProps) {
    return (
        <section className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
                <h2
                    className="scroll-mt-8 text-lab-title font-semibold text-text-primary"
                    id={slugOf(heading)}
                >
                    {heading}
                </h2>
                <Intent text={intent} />
            </div>
            {children}
        </section>
    );
}

/** La línea de qué mirar, a tamaño de lectura; nada si la sección no la trae. */
export function Intent({ text }: { text: string | undefined }) {
    if (text === undefined) {
        return null;
    }

    return <p className="max-w-2xl text-lab-body text-text-secondary">{text}</p>;
}
