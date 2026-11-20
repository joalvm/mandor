import { Button } from '@mandor/ui';
import { useState, type PropsWithChildren } from 'react';

import { CodeBlock } from './code-block.js';
import { Intent } from './doc-section.js';
import { slugOf } from './slug.js';

/** Cómo se coloca lo que se exhibe dentro del lienzo de la demo. */
type DemoLayout = 'center' | 'start' | 'stretch';

const CANVAS_LAYOUT: Record<DemoLayout, string> = {
    center: 'items-center justify-center',
    start: 'flex-row items-center flex-wrap',
    stretch: 'items-stretch',
};

/**
 * La superficie donde la pieza vive en la app: el contenido sobre la tarjeta, el cromo (la tira
 * de pestañas, las barras del marco) sobre el marco.
 */
type DemoGround = 'card' | 'frame';

const GROUND_CLASSES: Record<DemoGround, string> = {
    card: 'bg-surface-card',
    frame: 'bg-surface-frame',
};

/** Lo que la tarjeta muestra: la pieza funcionando o su código. */
type DemoView = 'canvas' | 'code';

const VIEWS: readonly { label: string; view: DemoView }[] = [
    { label: 'Vista', view: 'canvas' },
    { label: 'Código', view: 'code' },
];

type ViewState = 'current' | 'rest';

/** Las dos vistas están montadas siempre: la que no se mira solo se oculta. */
const PANEL_CLASSES: Record<ViewState, string> = { current: '', rest: 'hidden' };

const VIEW_TAB_CLASSES: Record<ViewState, string> = {
    current: 'bg-surface-selected text-text-primary hover:veil',
    rest: 'text-text-secondary hover:veil',
};

function stateOf(view: DemoView, open: DemoView): ViewState {
    return view === open ? 'current' : 'rest';
}

type DemoProps = PropsWithChildren<{
    heading: string;
    /** Qué hay que mirar en esta demo. Una línea, no un párrafo. */
    intent?: string;
    /** La fuente de la demo, importada del mismo archivo que la pinta. */
    code: string;
    layout?: DemoLayout;
    /** La superficie del lienzo; el cromo se mira sobre el marco. */
    ground?: DemoGround;
}>;

/**
 * Una demostración: la pieza funcionando y, en la pestaña de al lado, el código exacto que la
 * produce. Las dos vistas están montadas siempre y una se oculta: cambiar de pestaña no puede
 * reiniciar un control a medio pulsar, porque entonces la demo deja de servir para revisar
 * estados.
 *
 * Comparar es diseñar: lo que se compara va en una rejilla de columnas iguales, una celda por
 * variante, con su leyenda debajo cuando el control no se nombra solo. El lienzo centra siempre
 * en vertical, así que lo que se ve distinto es el componente y no el montaje.
 */
export function Demo({
    children,
    code,
    ground = 'card',
    heading,
    intent,
    layout = 'stretch',
}: DemoProps) {
    const [view, setView] = useState<DemoView>('canvas');

    return (
        <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
                <h3
                    className="scroll-mt-8 text-xl font-semibold text-text-primary"
                    id={slugOf(heading)}
                >
                    {heading}
                </h3>
                <Intent text={intent} />
            </div>
            <div className="overflow-hidden rounded-panel border border-border-subtle">
                <div
                    aria-label="Vista o código"
                    className="flex h-section items-center gap-1 border-b border-border-subtle px-2"
                    role="group"
                >
                    {VIEWS.map((entry) => (
                        <Button
                            aria-pressed={entry.view === view}
                            className={VIEW_TAB_CLASSES[stateOf(entry.view, view)]}
                            key={entry.view}
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setView(entry.view);
                            }}
                        >
                            {entry.label}
                        </Button>
                    ))}
                </div>
                <div
                    className={`flex min-h-40 flex-col gap-6 p-8 ${GROUND_CLASSES[ground]} ${CANVAS_LAYOUT[layout]} ${PANEL_CLASSES[stateOf('canvas', view)]}`}
                >
                    {children}
                </div>
                <div className={PANEL_CLASSES[stateOf('code', view)]}>
                    <CodeBlock code={code} frame="bare" />
                </div>
            </div>
        </section>
    );
}
