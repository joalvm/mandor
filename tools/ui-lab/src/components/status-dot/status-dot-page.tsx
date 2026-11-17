import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { ContextoDemo } from './contexto.js';
import contextoCode from './contexto.tsx?raw';
import { EstadosDemo } from './estados.js';
import estadosCode from './estados.tsx?raw';

const STATUS_DOT_API = [
    {
        name: 'state',
        type: "'connected' | 'connecting' | 'disconnected' | 'error'",
        note: 'El estado vivo que pinta; cada uno su relleno y su borde.',
    },
    {
        name: 'label',
        type: 'string',
        note: 'El nombre accesible y el texto del tooltip. Nunca title: el globo nativo llega tarde y doble.',
    },
] as const;

/** El punto de estado: forma y etiqueta para lo que está vivo ahora mismo. */
export function StatusDotPage() {
    return (
        <DocPage
            lead="El estado de algo que corre: conectada, conectando, caída, rota. Un punto de dos
                píxeles de radio que nunca trabaja solo al color — conserva su forma y su etiqueta,
                y la etiqueta sale por el tooltip del sistema cuando se apunta."
            title="StatusDot"
        >
            <Demo
                code={estadosCode}
                heading="Estados"
                intent="El connecting late; con menos movimiento preferido, deja de latir y se queda quieto."
                layout="stretch"
            >
                <EstadosDemo />
            </Demo>

            <Demo
                code={contextoCode}
                heading="En su fila"
                intent="El punto vive dentro de la fila del recurso: no abre columnas ni bandas propias."
                layout="start"
            >
                <ContextoDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Dos props; el punto no es un control y no recibe handlers."
            >
                <ApiTable caption="Props de StatusDot" rows={STATUS_DOT_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>Nunca color solo: forma y etiqueta acompañan siempre.</li>
                    <li>
                        La etiqueta nombra el estado («Conectada»), no el componente («Punto
                        verde»).
                    </li>
                    <li>
                        El latido de connecting es señal, no decoración: se apaga con{' '}
                        <code className="font-mono text-xs">prefers-reduced-motion</code>.
                    </li>
                    <li>
                        Para clasificar sin estado vivo está{' '}
                        <a className="text-text-accent" href="#/components/badge">
                            Badge
                        </a>
                        ; el punto late, la pastilla no.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
