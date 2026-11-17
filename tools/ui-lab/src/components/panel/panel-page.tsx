import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import migasCode from './migas.tsx?raw';
import { MigasDemo } from './migas.js';
import regionCode from './region.tsx?raw';
import { RegionDemo } from './region.js';
import vacioCode from './vacio.tsx?raw';
import { VacioDemo } from './vacio.js';

const PANEL_API = [
    {
        name: 'title',
        type: 'string',
        note: 'El nombre de la región. Es lo único que la cabecera lleva: sin acciones, sin menús.',
    },
    { name: 'children', type: 'ReactNode', note: 'El cuerpo, con scroll propio bajo la cabecera.' },
] as const;

const BREADCRUMBS_API = [
    {
        name: 'label',
        type: 'string',
        note: 'Cómo nombra un lector la ruta. Texto, nunca navegación.',
    },
    {
        name: 'children',
        type: 'ReactNode',
        note: 'La marca de lo que la ruta nombra (protocolo, transporte), en su tono. No es un tramo.',
    },
    {
        name: 'parts',
        type: 'readonly string[]',
        note: 'Dónde vive lo que se mira, de fuera hacia dentro. Si no cabe, pliega el medio en «…»; cada tramo trunca por su cuenta.',
    },
] as const;

const EMPTY_STATE_API = [
    {
        name: 'icon',
        type: 'IconName',
        note: 'Obligatorio: separa un vacío real de una región que falló al cargar.',
    },
    {
        name: 'title',
        type: 'string',
        note: 'Qué falta. Es el nombre accesible de la región de estado.',
    },
    {
        name: 'description',
        type: 'string',
        note: 'Por qué está vacío y qué hacer. «Sin conexiones» a secas está mal.',
    },
    {
        name: 'children',
        type: 'ReactNode',
        note: 'La salida, si la hay: una acción primaria justo debajo. No siempre existe una.',
    },
] as const;

/** La región con nombre, el vacío explicado y la ruta como texto. */
export function PanelPage() {
    return (
        <DocPage
            lead="Tres piezas de superficie quieta: el panel que nombra una región y hace scroll
                bajo su cabecera, las migas que dicen dónde se está sin ofrecer nada que tocar, y
                el estado vacío que explica qué falta y cómo salir."
            title="Panel"
        >
            <Demo
                code={regionCode}
                heading="La región y su cuerpo"
                intent="La cabecera se queda con el nombre; el cuerpo hace scroll debajo. Nada más vive en la cabecera."
            >
                <RegionDemo />
            </Demo>

            <Demo
                code={vacioCode}
                heading="El vacío, explicado"
                intent="Qué falta, por qué y la salida justo debajo. El glifo es obligatorio: sin él, un vacío lee como un fallo de carga."
            >
                <VacioDemo />
            </Demo>

            <Demo
                code={migasCode}
                heading="Las migas"
                intent="Sección nombrada, no landmark: el panel es quien nombra la ruta y el marco es el dueño del único nav."
            >
                <MigasDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Tres componentes sueltos que conviven en la misma superficie."
            >
                <ApiTable caption="Props de Panel" rows={PANEL_API} />
                <ApiTable caption="Props de Breadcrumbs" rows={BREADCRUMBS_API} />
                <ApiTable caption="Props de EmptyState" rows={EMPTY_STATE_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        La cabecera del panel lleva el nombre y nada más. Lo que actúa sobre la
                        región vive donde se ve: el menú de una fila, un botón del cuerpo. La
                        sección plegable sí lleva acciones, porque su cabecera es la línea del
                        toggle.
                    </li>
                    <li>
                        El cuerpo lleva <code className="font-mono text-xs">min-h-0</code>: sin él
                        no encoge y aparece scroll donde no toca.
                    </li>
                    <li>Una sola barra de acciones, arriba. Nunca al pie.</li>
                    <li>
                        El estado vacío siempre dice qué hacer. «Sin conexiones» está mal; «Sin
                        conexiones. Crea una para empezar a escuchar eventos.» está bien, con la
                        salida justo debajo.
                    </li>
                    <li>
                        Las migas son texto: nada que clicar. El lateral es lo que mueve al usuario.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
