import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { LINE_API, TABLE_API } from './api.js';
import entornosCode from './entornos.tsx?raw';
import headersCode from './headers.tsx?raw';
import tablaCode from './tabla.tsx?raw';
import { CabecerasDemo } from './headers.js';
import { EntornosDemo } from './entornos.js';
import { TablaDemo } from './tabla.js';

/** El bloque de la tabla clave-valor: pares con nombre, valor que habla variables y un interruptor. */
export function KeyValuePage() {
    return (
        <DocPage
            lead="Toda lista de pares de este producto es esta tabla: los parámetros de una petición,
                sus cabeceras, los campos de un cuerpo o las entradas de un entorno. Una sola anatomía
                —clave, valor, interruptor— y una sola manera de nacer, caminarse y decirse en texto."
            title="Tabla clave-valor"
        >
            <Demo
                code={tablaCode}
                heading="Los pares con tipos"
                intent="Escribe en la fila vacía del final: ahí nace una línea, sin botón que la pida. El tipo se promete junto a la clave y su panel crece con lo que el tipo lleva."
            >
                <TablaDemo />
            </Demo>

            <Demo
                code={headersCode}
                heading="La misma tabla, pedida para las cabeceras"
                intent="Con tipo, como los parámetros. Los tres extras son datos, nunca otra tabla: la clave sugiere los nombres del estándar mientras se escribe, el ojo de la barra trae las filas que la app añade sola y el menú de preajustes entra en un grupo entero."
            >
                <CabecerasDemo />
            </Demo>

            <Demo
                code={entornosCode}
                heading="La misma tabla, pedida para las entradas de un entorno"
                intent="Llana y de un solo extra: sin tipos, sin texto masivo, sin menú de columnas y con valores literales — aquí nacen las variables, no se hablan. La marca de secreta vive con el valor: puntos, badge y ojo propios; el ojo es la única puerta y, al salir del foco, vuelve a taparse. El candado de las acciones lo declara."
            >
                <EntornosDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="El componente conoce variables, nunca quién las tiene: vive en @mandor/env junto al campo que las habla."
            >
                <ApiTable caption="Props de KeyValueTable" rows={TABLE_API} />
                <ApiTable caption="La línea" rows={LINE_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        <strong>Sin botón de añadir.</strong> La fila vacía del final es la única
                        puerta: escribir en ella nace la línea y otra vacía entra en su lugar. El
                        foco sigue al texto.
                    </li>
                    <li>
                        <strong>La rejilla se camina sola.</strong> El tabulador recorre celda a
                        celda y las flechas cambian de fila y —solo desde el borde del texto— de
                        columna.
                    </li>
                    <li>
                        <strong>Las acciones de fila no pintan en reposo.</strong> Tirador, tipo y
                        puerta aparecen al apuntar y se quedan mientras el foco esté dentro.
                    </li>
                    <li>
                        <strong>El valor habla variables.</strong> Los tonos del entorno pinta cada{' '}
                        <code className="font-mono text-xs">{'{{nombre}}'}</code> y el popover
                        sugiere los nombres que caben mientras se escribe.
                    </li>
                    <li>
                        <strong>El texto masivo no es otro dialecto.</strong> Un par por línea,
                        <code className="font-mono text-xs"> clave:valor</code>, los apagados
                        comentados con <code className="font-mono text-xs">//</code>; al volver,
                        cada nombre recupera lo suyo. Lo promete la tabla que lo lleva; la de un
                        solo saber —las entradas de un entorno— nace sin él.
                    </li>
                    <li>
                        <strong>Lo secreto se tapa en su celda.</strong> El valor marcado como
                        secreta lleva puntos, un badge que lo dice y un ojo propio: revelar es
                        funcionalidad del valor, como en un campo de contraseña, no una acción de
                        fila, y el foco solo no destapa. Al salir del foco vuelve a taparse; el
                        candado de las acciones declara y quita la marca.
                    </li>
                    <li>
                        <strong>La derivación es vista, nunca campo.</strong> Lo que la tabla
                        compone —una dirección con sus parámetros— se muestra de solo lectura al
                        lado; jamás se escribe dentro del campo editable del dueño.
                    </li>
                    <li>
                        <strong>Los extras son datos, no otra tabla.</strong> Sugerencias, filas que
                        la app añade y preajustes entran por props de datos; quien no los da, tiene
                        la tabla llana de siempre. La anatomía única es la que garantiza que el
                        bulk, el arrastre y el caminar valen en cualquier uso.
                    </li>
                    <li>
                        <strong>Lo que la app añade no se edita.</strong> Las filas propias de la
                        app —la autorización que manda su pestaña, el tipo del cuerpo— se leen
                        apagadas sobre un velo apenas más opaco que el panel, con la línea que dice
                        por qué están, ocultas hasta que el ojo las pide. El valor dicho se lee en
                        la fuente del texto; el que solo el envío sabe va entre &lt;&gt;, dicho como
                        código.
                    </li>
                    <li>
                        La hoja de la primitiva (
                        <code className="font-mono text-xs">@mandor/env/styles/key-value.css</code>)
                        lleva la rejilla, el arrastre y el aire del foco; los importan las apps que
                        montan la tabla.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
