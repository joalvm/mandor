import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import panelesCode from './paneles.tsx?raw';
import { PanelesDemo } from './paneles.js';

const SPLIT_PANE_API = [
    {
        name: 'value',
        type: 'number',
        note: 'La parte que se lleva la primera mitad, en porcentaje. Lo guarda el llamador.',
    },
    {
        name: 'onValueChange',
        type: '(value: number) => void',
        note: 'Cada movimiento del divisor.',
    },
    {
        name: 'direction',
        type: "'row' | 'column'",
        def: "'row'",
        note: 'Dónde cae la segunda mitad: al lado o debajo.',
    },
    {
        name: 'min / max',
        type: 'number',
        def: '30 / 70',
        note: 'El rango del corte. Nada se hace invisible.',
    },
    { name: 'label', type: 'string', note: 'El nombre del separador para el lector.' },
] as const;

const SPLIT_HALF_API = [
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Una mitad. Declara que puede encoger: sin ella, una línea larga empuja a la otra.',
    },
] as const;

/** Dos regiones y la línea entre ellas, sin dueño para la posición. */
export function SplitPanePage() {
    return (
        <DocPage
            lead="El corte del centro de la ventana, el eje de las dos apps: a la izquierda lo que
                se compone, a la derecha lo que vuelve. Divisor de un píxel que flota sobre el
                corte, con zona de agarre de 8 px; por defecto mitad y mitad, dentro de 30–70 %."
            title="SplitPane"
        >
            <Demo
                code={panelesCode}
                heading="Los dos ejes"
                intent="Teclado obligatorio: flechas 8 px, 32 con Shift. Doble clic devuelve el reparto por defecto; el número lo guarda el llamador, no el divisor."
            >
                <PanelesDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="El componente no posee la posición: la recibe y la avisa."
            >
                <ApiTable caption="Props de SplitPane" rows={SPLIT_PANE_API} />
                <ApiTable caption="Props de SplitHalf" rows={SPLIT_HALF_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Las mitades se escriben dentro, como hijos: una tercera región o un orden
                        distinto no puede obligar a cambiar el componente para todos.
                    </li>
                    <li>
                        El divisor lleva <code className="font-mono text-xs">role="separator"</code>{' '}
                        con <code className="font-mono text-xs">aria-valuenow</code>, min y max. El
                        foco lo pinta con el anillo: la misma línea, otro color.
                    </li>
                    <li>
                        El teclado es obligatorio, no un extra: flechas 8 px, con Shift 32. Doble
                        clic, el centro.
                    </li>
                    <li>
                        La posición se persiste en preferencias por el llamador — en píxeles de
                        lateral, en porcentaje de centro —, nunca en el estado del componente.
                    </li>
                    <li>
                        Si el divisor pierde el puntero a mitad de arrastre —una interrupción del
                        sistema—, la línea se suelta donde estaba y no sigue arrastrando sola.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
