import transicionesCode from './transiciones.tsx?raw';
import { TransicionesDemo } from './transiciones.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TokenTable } from '../../pieces/token-table.js';

const EASINGS: readonly { note?: string; token: string; utility?: string }[] = [
    {
        token: '--mandor-ease-out',
        utility: 'ease-out',
        note: 'lo que entra: llega rápido y se asienta',
    },
    { token: '--mandor-ease-in', utility: 'ease-in', note: 'lo que sale: se recoge y desaparece' },
];

export function MovimientoPage() {
    return (
        <DocPage
            lead="Tres duraciones y dos curvas, y con eso se escribe todo el movimiento de la
                interfaz. El movimiento confirma lo que el ojo ya entendió; nunca lo cuenta primero,
                y nunca pide atención por su cuenta."
            title="Movimiento"
        >
            <Demo
                code={transicionesCode}
                heading="Las tres duraciones, en su trabajo"
                intent="Cada token con la interacción real que le toca, repetible: el hover de un control, lo que se abre, lo que se despliega."
            >
                <TransicionesDemo />
            </Demo>

            <DocSection
                heading="Las curvas"
                intent="Dos direcciones: fuera es como entra lo que aparece, dentro es como se va lo que desaparece."
            >
                <TokenTable caption="Las curvas" preview="value" rows={EASINGS} />
            </DocSection>

            <DocSection
                heading="Sin movimiento, si no se pide"
                intent="Las tres duraciones bajan a cero cuando el sistema pide menos movimiento: el lab no es una excepción."
            >
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        <code className="font-mono text-xs">scales.css</code> anula las duraciones
                        bajo{' '}
                        <code className="font-mono text-xs">prefers-reduced-motion: reduce</code>.
                    </li>
                    <li>
                        Nada se mueve al cargar una vista: el primer dibujo ya es el definitivo.
                    </li>
                    <li>
                        Lo que transiciona es color y desplazamiento pequeño; el layout no se anima.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
