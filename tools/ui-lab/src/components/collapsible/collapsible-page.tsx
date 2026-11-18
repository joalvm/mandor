import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import seccionCode from './seccion.tsx?raw';
import { SeccionDemo } from './seccion.js';

const COLLAPSIBLE_API = [
    {
        name: 'open',
        type: 'boolean',
        note: 'El estado del pliegue. Decide un tamaño, no un look: abierta toma lo que queda, plegada solo su cabecera.',
    },
    {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        note: 'El pliegue es del consumidor: el lateral lo escribe en la sesión.',
    },
] as const;

const HEADER_API = [
    { name: 'title', type: 'string', note: 'El nombre de la región. El trigger entero lo dice.' },
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Lo que aplica a la región: el botón que añade, el menú que vacía. Va fuera del trigger.',
    },
] as const;

const BODY_API = [
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Lo que la región guarda, en columna: el árbol que scrollea toma la altura que queda.',
    },
] as const;

/** La región que se pliega en su cabecera, la pieza que da al lateral sus secciones. */
export function CollapsiblePage() {
    return (
        <DocPage
            lead="Una región nombrada que se pliega en su cabecera. El chevron es de la cabecera —
                dice cómo está la región, no lo cuelga nadie — y gira una vez para todas, en el
                runtime. Plegada es solo su cabecera: una sección que desaparece no se puede
                traer de vuelta."
            title="Collapsible"
        >
            <Demo
                code={seccionCode}
                heading="La sección del lateral"
                intent="Plega con el chevron o con Enter sobre el título; la acción de la región vive junto al título, fuera del trigger. Un botón dentro de un botón no lo resuelve ningún navegador."
            >
                <SeccionDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Tres piezas: la raíz que manda el tamaño, la línea que nombra, el cuerpo que scrollea."
            >
                <ApiTable caption="Props de Collapsible" rows={COLLAPSIBLE_API} />
                <ApiTable caption="Props de CollapsibleHeader" rows={HEADER_API} />
                <ApiTable caption="Props de CollapsibleBody" rows={BODY_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El estado del pliegue lo escribe el consumidor —la sesión del workspace—, no
                        el componente: es un tamaño, no un look.
                    </li>
                    <li>
                        La cabecera lee como un epígrafe, no como una fila: un paso menor (
                        <code className="font-mono text-xs">text-xs</code>) y peso 600 frente a las
                        filas de <code className="font-mono text-xs">text-sm</code> regular, con la
                        misma tinta de texto — la jerarquía es tamaño y peso, nunca color.
                    </li>
                    <li>
                        La cabecera se queda al plegar. El chevron gira, el glifo no cambia: la
                        región no se convierte en otra cuando se cierra.
                    </li>
                    <li>
                        Las acciones de la región van junto al título y fuera del trigger: un botón
                        dentro de un botón no lo resuelve ningún navegador. No toda región tiene
                        una; la línea cierra tras el título.
                    </li>
                    <li>
                        El cuerpo hace scroll propio, así que plegar una vecina nunca mueve lo que
                        se estaba leyendo.
                    </li>
                    <li>
                        Apiladas en el lateral no se redimensionan: cada una mide lo que lleva,
                        hasta un tope, y una sola se queda el alto restante.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
