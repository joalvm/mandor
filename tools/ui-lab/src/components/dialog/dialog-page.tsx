import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { ConfirmarDemo } from './confirmar.js';
import confirmarCode from './confirmar.tsx?raw';
import { GuardarDemo } from './guardar.js';
import guardarCode from './guardar.tsx?raw';
import { FormularioDemo } from './formulario.js';
import formularioCode from './formulario.tsx?raw';
import { SeccionesDemo } from './secciones.js';
import seccionesCode from './secciones.tsx?raw';

const DIALOG_API = [
    {
        name: 'open',
        type: 'boolean',
        note: 'Abierto controlado; quien lo abre guarda el estado y cierra con él.',
    },
    {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        note: 'Avisa de Esc y del cierre. Esc siempre cancela: quien abre cierra aquí también.',
    },
    {
        name: 'title',
        type: 'string',
        note: 'El nombre exacto del objeto. Envuelve hacia abajo; nunca se corta.',
    },
    {
        name: 'closeLabel',
        type: 'string',
        note: 'El nombre accesible del cierre de la esquina, que es la última parada del tab.',
    },
] as const;

const CONFIRM_API = [
    {
        name: 'confirmationName',
        type: 'string',
        note: 'Lo que hay que teclear para desbloquear el verbo. Lo que no se puede deshacer pide su nombre, no un click.',
    },
    {
        name: 'onConfirm',
        type: '() => void',
        note: 'El verbo, en rojo: el único rojo de la ventana que habla de lo que va a pasar.',
    },
    {
        name: 'onCancel',
        type: '() => void',
        note: 'La vuelta atrás. El foco empieza aquí: la alerta lo lleva al botón menos destructivo.',
    },
] as const;

const NAV_API = [
    {
        name: 'label',
        type: 'string',
        note: 'El nombre de la lista de secciones, para quien no ve la columna.',
    },
    {
        name: 'icon',
        type: 'IconName',
        note: 'El glifo de cada sección, obligatorio: una columna que mezcla líneas con y sin glifo arranca sus nombres en dos sitios.',
    },
    {
        name: 'selected',
        type: 'boolean',
        note: 'La sección abierta. Solo ella entra en el orden de tabulación; las flechas son de la lista.',
    },
] as const;

/** El marco que interrumpe: cuatro casos, y nada más. */
export function DialogPage() {
    return (
        <DocPage
            lead="El marco que interrumpe. Cuatro casos y nada más: diálogo del sistema, confirmación
                irreversible, decisión de seguridad y formulario corto de configuración. Un solo
                corte para todos —el que pregunta y el que lleva formulario se diferencian en
                comportamiento, nunca en look— y el tamaño lo decide lo que contiene, no una prop."
            title="Dialog"
        >
            <Demo
                code={formularioCode}
                heading="El formulario corto"
                intent="Dos campos y las dos respuestas al pie. El cuerpo es lo único que scrollea; Esc cancela y el foco vuelve a quien lo abrió."
            >
                <FormularioDemo />
            </Demo>

            <Demo
                code={confirmarCode}
                heading="La confirmación irreversible"
                intent="El título nombra el objeto, el cuerpo dice qué se pierde y el nombre escrito desbloquea el verbo rojo. El foco empieza en Conservar; sin cierre en la esquina y sin clic fuera: las dos respuestas son las únicas salidas."
            >
                <ConfirmarDemo />
            </Demo>

            <Demo
                code={guardarCode}
                heading="Los cambios sin guardar"
                intent="Antes de cerrar algo con trabajo sin guardar: Guardar es el primario, No guardar va callado porque solo termina una edición, y el foco empieza en Cancelar. Cerrar muchas pestañas pregunta por cada una, de a una."
            >
                <GuardarDemo />
            </Demo>

            <Demo
                code={seccionesCode}
                heading="La columna de secciones"
                intent="800 × 480 con el marco quieto mientras se cambia. La lista se recorre con flechas sin elegir; Intro o espacio abren, y el tab para una sola vez."
                layout="center"
            >
                <SeccionesDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Dialog compone con Header, Body y Footer; ConfirmDialog es la alerta irreversible completa; SaveChangesDialog, la pregunta por los cambios sin guardar; DialogNav es la columna de secciones de los formularios largos."
            >
                <ApiTable caption="Props de Dialog" rows={DIALOG_API} />
                <ApiTable caption="Props de ConfirmDialog" rows={CONFIRM_API} />
                <ApiTable caption="Props de DialogNav y sus partes" rows={NAV_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Cuatro casos de la política de modales. Un PR que añade un diálogo declara
                        cuál cumple; si no cumple ninguno, es un Popover.
                    </li>
                    <li>
                        Esc siempre cancela: si cancelar tuviera efecto, no era un diálogo. Quien
                        abre cierra también en{' '}
                        <code className="font-mono text-xs">onOpenChange</code>.
                    </li>
                    <li>Un diálogo no abre otro diálogo.</li>
                    <li>
                        El foco empieza en lo que el diálogo contiene; en la confirmación, en el
                        botón menos destructivo — lo garantiza la alerta debajo.
                    </li>
                    <li>
                        El tamaño lo decide el contenido: 400 la confirmación, 520 el formulario,
                        800 × 480 el de secciones. Ningún consumidor elige ancho.
                    </li>
                    <li>
                        El título es el único texto en negrita y envuelve hacia abajo: un nombre
                        partido es lo único que una confirmación no se puede permitir.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
