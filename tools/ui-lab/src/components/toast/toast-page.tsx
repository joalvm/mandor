import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { AccionDemo } from './accion.js';
import accionCode from './accion.tsx?raw';
import { TonosDemo } from './tonos.js';
import tonosCode from './tonos.tsx?raw';

const TOAST_API = [
    {
        name: 'title',
        type: 'string',
        note: 'La línea que se anuncia; llega entera a la región viva.',
    },
    {
        name: 'tone',
        type: "'success' | 'info' | 'warning' | 'error'",
        note: 'La insignia teñida y su glifo.',
    },
    { name: 'detail', type: 'string', note: 'La segunda línea; corta, sin mejorar el título.' },
    {
        name: 'action',
        type: '{ label, onSelect }',
        note: 'La vuelta atrás; entra al orden de tab del toast.',
    },
] as const;

const PROVEEDOR_API = [
    {
        name: 'messages.close',
        type: 'string',
        note: 'El nombre del botón de cerrar, en el idioma de la interfaz.',
    },
    {
        name: 'messages.more',
        type: '(count: number) => string',
        note: 'La línea que cuenta lo que no cabe; a partir de cuatro.',
    },
] as const;

/** El único canal efímero del sistema: avisos que se van, nunca el registro. */
export function ToastPage() {
    return (
        <DocPage
            lead="El canal efímero. Un aviso entra por la esquina, se anuncia por una región viva y
                se va solo — salvo el error, que se queda hasta que lo cierren, porque un fallo no
                leído no es un fallo contado. Todo lo que deba sobrevivir a un parpadeo pertenece al
                registro de actividad: el toast es siempre una segunda copia y nunca el archivo."
            title="Toast"
        >
            <Demo
                code={tonosCode}
                heading="Los cuatro tonos"
                intent="Insignia, título y cierre en una lectura; repetir un tono suma ×N; el título corta en dos líneas y el detalle en tres — pruébalo con el botón largo. Success e info se van a los 4 segundos; warning a los 6; error se queda. Con el cursor encima el conteo se detiene y sigue al salir."
                layout="stretch"
            >
                <TonosDemo />
            </Demo>

            <Demo
                code={accionCode}
                heading="La vuelta atrás"
                intent="Una sola acción, como botón secundario bajo el texto; entra al orden de tab del toast."
                layout="start"
            >
                <AccionDemo />
            </Demo>

            <DocSection heading="API" intent="Lo que pide quien avisa; la cola pone el id.">
                <ApiTable caption="El aviso (useToast → notify)" rows={TOAST_API} />
                <ApiTable caption="El proveedor (ToastProvider)" rows={PROVEEDOR_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Una tarjeta de 380 contra la esquina inferior derecha. Se apilan tres, los
                        de atrás asomando bajo el último; la pila se abre al apuntarla o al llegar
                        con el foco, y lo que no cabe se cuenta.
                    </li>
                    <li>El error no caduca; los demás sí, cada uno según su gravedad.</li>
                    <li>
                        Pausan al pasar el puntero y al enfocar: nada se cierra debajo de la mano.
                    </li>
                    <li>
                        El título corta en dos líneas y el detalle en tres: lo que no cabe no se lee
                        en un aviso.
                    </li>
                    <li>El tono va en la insignia y su glifo; la superficie no cambia.</li>
                    <li>
                        Nunca es el único lugar donde un dato vive: siempre hay registro detrás.
                    </li>
                    <li>El acento no entra: el toast nunca es una acción primaria.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
