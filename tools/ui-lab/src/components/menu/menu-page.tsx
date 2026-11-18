import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { MarcasDemo } from './marcas.js';
import marcasCode from './marcas.tsx?raw';
import { OrdenesDemo } from './ordenes.js';
import ordenesCode from './ordenes.tsx?raw';

const MENU_API = [
    {
        name: 'checkable',
        type: 'boolean',
        def: 'false',
        note: 'Si sus líneas pueden llevar la marca del elegido: peso, nunca glifo.',
    },
] as const;

const MENUBUTTON_API = [
    {
        name: 'icon',
        type: 'IconName',
        note: 'El glifo de lo que el botón nombra. No es opcional: todos los botones empiezan en el mismo sitio.',
    },
    {
        name: 'label',
        type: 'string',
        note: 'El nombre. El chevron no se pregunta: es la única marca que separa abrir una lista de ejecutar una orden.',
    },
    {
        name: 'variant',
        type: 'ButtonVariant',
        note: 'El mismo juego de variantes de Button.',
    },
    {
        name: 'disabled',
        type: 'boolean',
        note: 'Apagado sigue donde estaba: la fila no se mueve, y el motivo va en el tooltip.',
    },
] as const;

const MENUITEM_API = [
    {
        name: 'onSelect',
        type: '() => void',
        note: 'Corre cuando el menú se cierra, no mientras sigue abierto: un campo abierto por la línea no pierde el foco.',
    },
    {
        name: 'checked',
        type: 'boolean',
        note: 'La marca del elegido, solo en un menú checkable: se pinta en peso.',
    },
    {
        name: 'disabledReason',
        type: 'string',
        note: 'El motivo que la línea apagada dice al pasar el puntero.',
    },
] as const;

const SHORTCUT_API = [
    {
        name: 'children',
        type: 'string',
        note: 'Las teclas, escritas por quien llama y pegadas al borde lejano de la línea.',
    },
] as const;

/** Una lista cerrada de órdenes, colgada de un botón con nombre. */
export function MenuPage() {
    return (
        <DocPage
            lead="Una lista cerrada de órdenes, colgada de un botón con nombre. El menú dibuja
                texto y nada más: la línea elegida va en peso, la apagada dice su motivo, y la
                destructiva va al final, tras un separador, con el mismo color que las demás y
                puntos suspensivos. Al cerrarse devuelve el foco a su disparador, salvo que la
                línea elegida ya lo haya llevado a otro sitio."
            title="Menu"
        >
            <Demo
                code={ordenesCode}
                heading="Las órdenes de una conexión"
                intent="Atajo en su línea, glifo solo donde lo lleva, apagada con motivo y la destructiva al final con puntos suspensivos. Elige una: corre al cerrarse el menú, no antes."
            >
                <OrdenesDemo />
            </Demo>

            <Demo
                code={marcasCode}
                heading="El menú con marcas"
                intent="Con checkable, la línea del entorno activo va en peso. Sin columna reservada: quien no lleva glifo empieza donde empieza el texto."
            >
                <MarcasDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="El árbol completo: raíz, disparador, contenido y líneas. MenuButton es el disparador con nombre —glifo, nombre y chevron— y sustituye a MenuTrigger cuando hay un botón que escribe."
            >
                <ApiTable caption="Props de Menu" rows={MENU_API} />
                <ApiTable caption="Props de MenuButton" rows={MENUBUTTON_API} />
                <ApiTable caption="Props de MenuItem" rows={MENUITEM_API} />
                <ApiTable caption="Props de MenuShortcut" rows={SHORTCUT_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        La línea elegida se marca con peso, nunca con un glifo, y solo si el menú
                        dijo checkable. El hueco de la izquierda existe solo cuando la línea lleva
                        icono.
                    </li>
                    <li>
                        Un item destructivo va al final, tras separador, con el mismo color que los
                        demás y puntos suspensivos: nada en rojo dentro de un menú.
                    </li>
                    <li>
                        Máximo doce items. Más es un submenú o trabajo para la paleta de comandos.
                    </li>
                    <li>
                        La línea elegida corre cuando el menú se cierra: un campo que la línea abre
                        no pierde el foco nada más recibirlo.
                    </li>
                    <li>
                        Al cerrarse, el foco vuelve al disparador, salvo que la línea lo llevara a
                        otro sitio.
                    </li>
                    <li>Todo item de un menú existe también en la paleta de comandos.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
