import { ApiTable } from '../../pieces/api-table.js';
import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { CompactoDemo } from './compacto.js';
import compactoCode from './compacto.tsx?raw';
import { TonosDemo } from './tonos.js';
import tonosCode from './tonos.tsx?raw';

const METHOD_MARK_API = [
    {
        name: 'method',
        type: 'string',
        note: 'El verbo, en cualquier caja: se pinta en mayúsculas.',
    },
    {
        name: 'compact',
        type: 'boolean',
        def: 'false',
        note: 'Verbo recortado (DEL, OPT), más chico y más pesado: para listas y pestañas. La ranura fija la pone la lista.',
    },
] as const;

/** El verbo de una petición con su tono, igual en el árbol, la pestaña y la barra. */
export function MethodMarkPage() {
    return (
        <DocPage
            lead="El verbo de una petición en el tono que lo distingue de un vistazo. El mismo verbo y
                el mismo tono en la colección, la pestaña y la barra de dirección: el ojo lo aprende
                una vez. El tono es contenido, no estado."
            title="MethodMark"
        >
            <Demo
                code={tonosCode}
                heading="Tonos"
                intent="Siete verbos estándar con tono propio (tokens text-method-*); uno desconocido queda en gris."
                layout="start"
            >
                <TonosDemo />
            </Demo>

            <Demo
                code={compactoCode}
                heading="Compacto"
                intent="En la fila dla colección ocupa el sitio del glifo, en una ranura fija que alinea los nombres."
                layout="start"
            >
                <CompactoDemo />
            </Demo>

            <DocSection heading="API" intent="Todas las props; MethodMark no recibe handlers.">
                <ApiTable caption="Props de MethodMark" rows={METHOD_MARK_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El tono pinta qué es la petición. Un DELETE rojo no avisa de nada: el rojo
                        de estado sigue reservado para lo que ya pasó.
                    </li>
                    <li>
                        La forma completa hereda el peso de donde vive: un menú marca su línea
                        elegida con él.
                    </li>
                    <li>No es un control: sin foco, sin cursor de mano.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
