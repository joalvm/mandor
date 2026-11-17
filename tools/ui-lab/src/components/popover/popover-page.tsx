import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { CrearDemo } from './crear.js';
import crearCode from './crear.tsx?raw';
import { FlotanteDemo } from './flotante.js';
import flotanteCode from './flotante.tsx?raw';

const POPOVER_API = [
    {
        name: 'open',
        type: 'boolean',
        note: 'Abierto controlado; quien lo abre decide con el estado de su superficie.',
    },
    {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        note: 'Avisa de Esc, del clic fuera y de la elección que lo cierra.',
    },
    {
        name: 'anchor',
        type: 'RefObject<PopoverAnchor | null>',
        note: 'Un rect propio para colgarse, para los paneles que abren dentro de un campo o un editor.',
    },
    {
        name: 'modal',
        type: 'boolean',
        def: 'true',
        note: 'Modal se lleva el foco y el orden de tabulación. El panel que abre el puntero va sin modal.',
    },
] as const;

const TRIGGER_API = [
    {
        name: 'children',
        type: 'ReactElement',
        note: 'El control que abre; no dibuja nada propio y le entrega la apertura y la vuelta del foco.',
    },
] as const;

const PANEL_API = [
    {
        name: 'label',
        type: 'string',
        note: 'El nombre accesible del panel; por él se llega sin verlo.',
    },
    {
        name: 'autofocus',
        type: 'boolean',
        def: 'true',
        note: 'Si toma el foco al abrir. El panel que abrió el puntero lo deja donde estaba.',
    },
] as const;

/** El formulario corto anclado a lo que lo abrió. */
export function PopoverPage() {
    return (
        <DocPage
            lead="El formulario corto anclado a lo que lo abrió: crear, cambiar, filtrar. Es lo que
                sustituye al modal —la política del workbench lo deja para tres casos y todo lo
                demás cae aquí—. Cierra con Esc y con clic fuera, y el foco vuelve al control que
                lo abrió. Un popover no abre otro popover."
            title="Popover"
        >
            <Demo
                code={crearCode}
                heading="El formulario corto"
                intent="El foco entra al primer campo y queda dentro. Cancelar y Crear cierran; el foco vuelve al botón."
            >
                <CrearDemo />
            </Demo>

            <Demo
                code={flotanteCode}
                heading="El panel que abre el puntero"
                intent="Sobre una {{variable}}: anclado a un rect propio, sin modal y sin tomar el foco. La gracia que lo deja alcanzar mientras el puntero cruza la pone quien lo abre."
            >
                <FlotanteDemo />
            </Demo>

            <DocSection heading="API" intent="Tres piezas: raíz, disparador y panel.">
                <ApiTable caption="Props de Popover" rows={POPOVER_API} />
                <ApiTable caption="Props de PopoverTrigger" rows={TRIGGER_API} />
                <ApiTable caption="Props de PopoverPanel" rows={PANEL_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Es lo que sustituye al modal: todo formulario corto vive aquí, y el modal
                        queda para los tres casos de la política del workbench.
                    </li>
                    <li>
                        Con un solo campo, Enter confirma. Con más, el botón primario del pie del
                        panel.
                    </li>
                    <li>
                        El foco entra al primer campo y queda dentro; al cerrar vuelve a quien lo
                        abrió.
                    </li>
                    <li>
                        El panel que abre el puntero —una variable, una sugerencia— va{' '}
                        <code className="font-mono text-xs">modal=false</code> y{' '}
                        <code className="font-mono text-xs">autofocus=false</code>: el campo debajo
                        sigue editándose.
                    </li>
                    <li>Un popover no abre otro popover.</li>
                    <li>Ancho del panel: 320. No se estira por contenido ni por llamada.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
