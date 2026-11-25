import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { ContadorDemo } from './contador.js';
import contadorCode from './contador.tsx?raw';
import { EsquinaDemo } from './esquina.js';
import esquinaCode from './esquina.tsx?raw';
import { TonosDemo } from './tonos.js';
import tonosCode from './tonos.tsx?raw';

const BADGE_API = [
    {
        name: 'tone',
        type: "'accent' | 'error' | 'info' | 'neutral' | 'success' | 'warning'",
        def: 'neutral',
        note: 'Siempre tinte de estado sobre superficie, nunca sólido.',
    },
    {
        name: 'count',
        type: 'boolean',
        def: 'false',
        note: 'Para números: ancho mínimo de un dígito y cifras tabulares.',
    },
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Una palabra o una cifra. Lo que necesita una frase no es una pastilla.',
    },
    { name: 'aria-label', type: 'string', note: 'Solo cuando el texto visible no basta solo.' },
] as const;

/** La pastilla: clasifica o cuenta, y no se parece a un control. */
export function BadgePage() {
    return (
        <DocPage
            lead="Marca una clasificación corta o una cuenta sin comportarse como un control: no se
                pulsa, no lleva foco, no promete teclado. Pinta con el tinte de su estado sobre la
                superficie — una pastilla sólida gritaría donde susurra."
            title="Badge"
        >
            <Demo
                code={tonosCode}
                heading="Tonos"
                intent="Seis significados prestados de los estados; el neutral para lo que no es nada de eso."
                layout="start"
            >
                <TonosDemo />
            </Demo>

            <Demo
                code={contadorCode}
                heading="Contador"
                intent="La pastilla pegada a lo que cuenta, dentro de una fila real: no ocupa una columna propia."
                layout="start"
            >
                <ContadorDemo />
            </Demo>

            <Demo
                code={esquinaCode}
                heading="En la esquina"
                intent="CornerCount: la cuenta sobre la esquina de un icono, más chica que el glifo y de 1 a 9+. Solo se ve; el nombre del control la dice."
                layout="start"
            >
                <EsquinaDemo />
            </Demo>

            <DocSection heading="API" intent="Todas las props; Badge no recibe handlers.">
                <ApiTable caption="Props de Badge" rows={BADGE_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>No es un control: sin onClick, sin foco, sin cursor de mano.</li>
                    <li>
                        Una palabra o una cifra. La idea que necesita una frase va en texto normal.
                    </li>
                    <li>
                        El rojo de error cuenta lo que ya falló; no advierte de lo que va a pasar.
                    </li>
                    <li>
                        Para el estado vivo de una conexión está{' '}
                        <a className="text-text-accent" href="#/components/status-dot">
                            StatusDot
                        </a>
                        : la pastilla clasifica, el punto late.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
