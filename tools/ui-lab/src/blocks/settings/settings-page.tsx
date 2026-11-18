import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { EDITING_API, INHERITANCE_API, PIECES_API, ROW_API } from './api.js';
import conexionCode from './conexion.tsx?raw';
import peticionCode from './peticion.tsx?raw';
import { ConexionDemo } from './conexion.js';
import { PeticionDemo } from './peticion.js';

/** El bloque de ajustes: filas de nombre, sentido y control, agrupadas y con su herencia dicha. */
export function SettingsPage() {
    return (
        <DocPage
            lead="Todo ajuste de este producto es una fila: qué es y qué significa a la izquierda, el
                control que lo cambia en una columna propia a la derecha. Los de una petición, los
                de una conexión y los generales de la app se escriben con las mismas piezas de
                @mandor/ui."
            title="Ajustes"
        >
            <Demo
                code={peticionCode}
                heading="Por defecto en la app, sobrescritos en la petición"
                intent="Arriba, la sección Peticiones de los ajustes de la app: valores propios, sin herencia. Abajo, una petición sobre ellos: cada fila dice «Por defecto en Ajustes» y lleva allí; cambiarla la hace propia y la línea pasa a devolverla. La petición guarda solo lo que cambió."
            >
                <PeticionDemo />
            </Demo>

            <Demo
                code={conexionCode}
                heading="Las mismas piezas en una conexión"
                intent="Una conexión de Mandor Realtime sobre los valores por defecto de la sección Conexiones: reintento y keepalive con las mismas piezas y la misma herencia."
            >
                <ConexionDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Primitivas sin dominio: viven en @mandor/ui y todo texto entra por props."
            >
                <ApiTable caption="Las piezas" rows={PIECES_API} />
                <ApiTable caption="Props de SettingRow" rows={ROW_API} />
                <ApiTable caption="SettingInheritance" rows={INHERITANCE_API} />
                <ApiTable caption="Quién edita" rows={EDITING_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        <strong>Los controles empiezan en la misma línea.</strong> La columna del
                        control tiene un ancho fijo por token; el texto toma el resto y envuelve.
                    </li>
                    <li>
                        <strong>La jerarquía es peso y color, no tamaño.</strong> La sección en
                        semibold, el nombre del ajuste en regular, los dos en el color del texto; la
                        ayuda en regular y más clara.
                    </li>
                    <li>
                        <strong>Sin línea entre filas.</strong> Las separa el aire; las secciones,
                        su nombre.
                    </li>
                    <li>
                        <strong>El estado es el relleno.</strong> El interruptor no lleva «ON» ni
                        «OFF» al lado: su color ya lo dice.
                    </li>
                    <li>
                        <strong>La herencia se dice, una vez.</strong> Mientras la fila sigue el
                        valor general, nombra el sitio que lo guarda y lleva a él. Cuando guarda lo
                        suyo, el mismo sitio lo devuelve. Nunca las dos cosas.
                    </li>
                    <li>
                        <strong>Lo condicional crece donde se promete.</strong> Las filas que solo
                        valen con otra encendida cuelgan de ella en una bandeja con el velo más
                        tenue, un paso adentro. La sangría mueve solo el texto: los controles siguen
                        en su columna. Se van cuando se apaga; ninguna fila deshabilitada esperando.
                    </li>
                    <li>
                        <strong>Un control por fila.</strong> La fila lo cablea como un Field: el
                        nombre es su etiqueta y la ayuda su descripción. Lo que pide varios valores
                        es una lista (texto, uno por línea) o un desplegable, en fila apilada si no
                        cabe en la columna.
                    </li>
                    <li>
                        <strong>Sin marcas de novedad.</strong> Lo nuevo no se anuncia en la fila:
                        el acento queda para foco, selección y acción primaria.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
