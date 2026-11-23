import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import columnaCode from './columna.tsx?raw';
import { ColumnaDemo } from './columna.js';
import estrechaCode from './estrecha.tsx?raw';
import { EstrechaDemo } from './estrecha.js';
import montajeCode from './montaje.tsx?raw';
import { MontajeDemo } from './montaje.js';
import seccionesCode from './secciones.tsx?raw';
import { SeccionesDemo } from './secciones.js';

const TABS_API = [
    {
        name: 'value',
        type: 'string',
        note: 'La sección abierta. Del quien sostiene el panel, nunca del componente.',
    },
    {
        name: 'onValueChange',
        type: '(value: string) => void',
        note: 'Avisa el cambio; el dueño lo guarda (en la pestaña, en la sesión).',
    },
    {
        name: 'orientation',
        type: "'horizontal' | 'vertical'",
        note: 'La tira sobre los paneles (por defecto) o la columna a su lado, que caminan las flechas arriba y abajo.',
    },
] as const;

const STRIP_API = [
    {
        name: 'children',
        type: 'ReactNode',
        note: 'El TabsList y, fuera de él, lo que aplica al panel entero: un botón no es una sección.',
    },
] as const;

const LIST_API = [
    { name: 'label', type: 'string', note: 'El nombre del tablist. Lo que caminan las flechas.' },
] as const;

const TAB_API = [
    {
        name: 'label',
        type: 'string',
        note: 'El nombre de la sección. Truncado con elipsis por la tira.',
    },
    { name: 'value', type: 'string', note: 'La sección que abre.' },
    {
        name: 'count',
        type: 'number',
        note: 'Cuántas entradas hay: se lee sin abrir. Cero no se dibuja.',
    },
    {
        name: 'dirty',
        type: 'boolean',
        note: 'Cambios sin enviar: el punto de acento gana sobre los demás.',
    },
    {
        name: 'filled',
        type: 'boolean',
        note: 'Hay contenido sin número que mostrar: el punto callado de la ranura.',
    },
    {
        name: 'muted',
        type: 'boolean',
        note: 'Lo que guarda está apartado (un script desactivado): el nombre se lee apagado.',
    },
] as const;

const PANEL_API = [
    {
        name: 'value',
        type: 'string',
        note: 'La sección que muestra. Desde su primera apertura queda montada y se esconde.',
    },
] as const;

/** La tira de secciones de un panel, con su pestaña sin color propio. */
export function TabsPage() {
    return (
        <DocPage
            lead="Un panel partido en secciones: la tira arriba, los paneles debajo. La pestaña no
                lleva color ni barra de acento — el relleno neutral dice cuál está abierta — y la
                ranura final está siempre, para que los títulos no bailen cuando el estado aparece."
            title="Tabs"
        >
            <Demo
                code={seccionesCode}
                heading="Las secciones y sus estados"
                intent="Recuento, punto de lo no enviado y punto callado, cada uno en la ranura final; el botón del panel entero fuera de la lista."
            >
                <SeccionesDemo />
            </Demo>

            <Demo
                code={montajeCode}
                heading="La sección que se queda montada"
                intent="Escribe en el campo, cambia de sección y vuelve: lo escrito sigue, porque esconder no es desmontar."
            >
                <MontajeDemo />
            </Demo>

            <Demo
                code={estrechaCode}
                heading="La tira que no cabe"
                intent="Las secciones que no caben siguen en la lista, cortadas en el borde; el menú al final (TabsOverflow) las ofrece con su recuento y su punto. Elegir una la abre y la tira se desplaza hasta ella."
            >
                <EstrechaDemo />
            </Demo>

            <Demo
                code={columnaCode}
                heading="Las secciones en columna"
                intent="Con orientation vertical la lista va al lado de los paneles, tan ancha como el nombre más largo y sin menú: caben todas. Punto si hay código, nombre apagado si está desactivado."
            >
                <ColumnaDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Un compuesto de cinco piezas que se escriben en orden."
            >
                <ApiTable caption="Props de Tabs" rows={TABS_API} />
                <ApiTable caption="Props de TabsStrip" rows={STRIP_API} />
                <ApiTable caption="Props de TabsList" rows={LIST_API} />
                <ApiTable caption="Props de TabsTab" rows={TAB_API} />
                <ApiTable caption="Props de TabsPanel" rows={PANEL_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        La pestaña mide 24, no el alto de su tira. Ancho el del nombre, hasta 240;
                        sin mínimo, sin borde y sin separador entre vecinas: las separa el aire.
                    </li>
                    <li>
                        Una pestaña no tiene color propio: lo tienen sus estados, y los dos rellenos
                        (hover y abierta) son neutros. Sin barra de acento: el acento queda para el
                        foco y el primario.
                    </li>
                    <li>
                        La ranura final es una y está siempre: el estado que la sección tenga
                        —recuento, lo no enviado— vive ahí, y el hueco vacío no desaparece.
                    </li>
                    <li>
                        La tira cierra con el filete del cromo, el mismo de la barra de título: dice
                        dónde acaba la banda.
                    </li>
                    <li>
                        La sección que abrió una vez queda montada y escondida: el borrador de un
                        editor no se pierde al mirar otra. La que nunca abrió no se construye.
                    </li>
                    <li>
                        Las flechas mueven el foco y la sección bajo el foco abre (activación
                        automática): los paneles ya están cargados, así que moverse es barato.
                        <code className="font-mono text-xs">Home</code> y{' '}
                        <code className="font-mono text-xs">End</code> van a los extremos.
                    </li>
                    <li>Lo que aplica al panel entero va en la tira, fuera de la lista.</li>
                    <li>
                        Una tira que no cabe no esconde ni encoge sus secciones: quedan en la lista,
                        cortadas en el borde, y la abierta se desplaza hasta verse entera. Las que
                        quedan fuera de la vista, a cualquier lado, salen en el menú del final, que
                        lleva el nombre de la lista porque es su resto.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
