import transicionesCode from './transiciones.tsx?raw';
import { TransicionesDemo } from './transiciones.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TokenTable, type TokenRow } from '../../pieces/token-table.js';

const DURATIONS: readonly TokenRow[] = [
    {
        token: '--mandor-duration-fast',
        utility: 'duration-fast',
        note: 'el hover de un control y la salida de una capa',
    },
    {
        token: '--mandor-duration-base',
        utility: 'duration-base',
        note: 'lo que se abre: menú, popover, tooltip, select',
    },
    {
        token: '--mandor-duration-slow',
        utility: 'duration-slow',
        note: 'lo que se despliega y la entrada del diálogo',
    },
    { token: '--mandor-duration-exit', note: 'la salida del diálogo y de su veladura' },
    {
        token: '--mandor-duration-travel',
        note: 'lo que se desplaza, como la pila de avisos; cero con menos movimiento',
    },
    {
        token: '--mandor-delay-handle',
        note: 'lo que espera el asa antes de encenderse al apuntarla',
    },
];

const DISTANCES: readonly TokenRow[] = [
    {
        token: '--mandor-motion-shift',
        note: 'lo que se desliza una pieza al entrar; cero con menos movimiento',
    },
    {
        token: '--mandor-motion-scale',
        note: 'desde dónde crece una capa al abrirse; uno con menos movimiento',
    },
    {
        token: '--mandor-motion-scale-overlay',
        note: 'desde dónde crecen el diálogo y el aviso; uno con menos movimiento',
    },
];

const EASINGS: readonly TokenRow[] = [
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
            lead="Cinco duraciones, tres distancias y dos curvas, y con eso se escribe todo el movimiento de la
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
                heading="Las duraciones"
                intent="Cinco tiempos y una espera. Lo que se hace cien veces al día no pasa de base."
            >
                <TokenTable caption="Las duraciones" rows={DURATIONS} />
            </DocSection>

            <DocSection
                heading="Las distancias"
                intent="Cuánto se mueve y cuánto crece lo que entra. Con menos movimiento valen cero y uno: queda el fundido."
            >
                <TokenTable caption="Las distancias" rows={DISTANCES} />
            </DocSection>

            <DocSection
                heading="Las curvas"
                intent="Dos direcciones: fuera es como entra lo que aparece, dentro es como se va lo que desaparece."
            >
                <TokenTable caption="Las curvas" rows={EASINGS} />
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
