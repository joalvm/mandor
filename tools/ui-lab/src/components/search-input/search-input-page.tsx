import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { FiltroDemo } from './filtro.js';
import filtroCode from './filtro.tsx?raw';

const SEARCH_API = [
    { name: 'value', type: 'string', note: 'El texto del filtro; quien llama lo guarda.' },
    { name: 'onValueChange', type: '(value: string) => void', note: 'Avisa con cada tecla.' },
    { name: 'label', type: 'string', note: 'El nombre accesible; anuncia role="searchbox".' },
    { name: 'placeholder', type: 'string', note: 'Lo que se lee vacío, atenuado.' },
    {
        name: 'editableRef',
        type: 'Ref<HTMLSpanElement>',
        note: 'Recibe la línea editable, para poner el caret desde fuera de React.',
    },
] as const;

/** El campo que estrecha una lista: una línea de texto tras el glifo que lo dice. */
export function SearchInputPage() {
    return (
        <DocPage
            lead='El campo de un filtro. Es una línea sola con el glifo de búsqueda delante — el
                glifo va de fábrica, no se elige — y se anuncia como role="searchbox", no como un
                campo de texto cualquiera. No tiene estados propios de error ni apagado: un filtro
                no se equivoca y un filtro no se apaga; si sobra, se quita.'
            title="SearchInput"
        >
            <Demo
                code={filtroCode}
                heading="Su caso único"
                intent="Escribe: la lista abre flotando bajo el campo y se estrecha con cada tecla. Sin coincidencias, no abre — nada que señalar. Elige una y el filtro toma su nombre."
                layout="stretch"
            >
                <FiltroDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Sin disabled ni invalid: un filtro siempre está vivo."
            >
                <ApiTable caption="Props de SearchInput" rows={SEARCH_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        El glifo va solo; quien lo pide como prop estaría duplicando lo que el
                        nombre del componente ya dice.
                    </li>
                    <li>
                        Se anuncia <code className="font-mono text-xs">role="searchbox"</code>: un
                        lector de pantalla lo nombra campo de búsqueda.
                    </li>
                    <li>La lista que estrecha vive fuera; el filtro no la dibuja.</li>
                    <li>Enter no envía nada: filtrar es en vivo, no un formulario.</li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
