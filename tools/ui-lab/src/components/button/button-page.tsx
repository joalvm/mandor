import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { CargaDemo } from './carga.js';
import cargaCode from './carga.tsx?raw';
import { EstadosDemo } from './estados.js';
import estadosCode from './estados.tsx?raw';
import { TamanosDemo } from './tamanos.js';
import tamanosCode from './tamanos.tsx?raw';
import { VariantesDemo } from './variantes.js';
import variantesCode from './variantes.tsx?raw';

const BUTTON_API = [
    {
        name: 'variant',
        type: "'primary' | 'secondary' | 'danger' | 'ghost' | 'chrome' | 'link'",
        def: 'secondary',
        note: 'Plano o de contorno, nunca las dos cosas. chrome lleva relleno y línea: vive en el cromo de la ventana.',
    },
    {
        name: 'size',
        type: "'sm' | 'md'",
        def: 'md',
        note: 'Las alturas h-control-sm y h-control de la escala.',
    },
    {
        name: 'loading',
        type: 'boolean',
        def: 'false',
        note: 'Deshabilita, pone aria-busy y cubre el contenido con el spinner: ni crece ni pierde el nombre accesible.',
    },
    {
        name: 'disabled',
        type: 'boolean',
        def: 'false',
        note: 'Apagado pierde su relleno: el verbo que nadie puede pulsar no pide color.',
    },
    {
        name: 'disabledReason',
        type: 'string',
        note: 'Por qué no corre; sale por el tooltip del sistema, nunca por title.',
    },
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Lo que dibuja: texto, glifo y texto o glifo solo. No hay prop de icono: lo que va dentro se escribe dentro.',
    },
] as const;

/** El botón: variantes, tamaños, estados y la carga que no mueve nada. */
export function ButtonPage() {
    return (
        <DocPage
            lead="La acción de una superficie. Un botón es plano o de contorno, nunca las dos cosas: relleno
                con línea alrededor se lee como control de otra década. Solo la variante del cromo lleva
                ambas, porque ahí la línea es la costura de la ventana."
            title="Button"
        >
            <Demo
                code={variantesCode}
                heading="Variantes"
                intent="Una sola acción primary por superficie; el resto se reparte entre las demás."
                layout="start"
            >
                <VariantesDemo />
            </Demo>

            <Demo
                code={tamanosCode}
                heading="Tamaños"
                intent="La altura la da la escala: h-control para una banda, h-control-sm para caber en una fila."
                layout="start"
            >
                <TamanosDemo />
            </Demo>

            <Demo
                code={estadosCode}
                heading="Estados"
                intent="Apunta con el ratón y salta con Tab: el hover y el anillo de foco son reales, pintados por runtime.css una vez para todos."
                layout="start"
            >
                <EstadosDemo />
            </Demo>

            <Demo
                code={cargaCode}
                heading="Carga"
                intent="Compara el ancho del primero con el segundo: el spinner cae encima, nada se mueve."
                layout="start"
            >
                <CargaDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Las props propias; el resto viajan al button nativo, y type cae en button si no se pasa."
            >
                <ApiTable caption="Props de Button" rows={BUTTON_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Una sola <code className="font-mono text-xs">primary</code> por superficie:
                        dos botones llenos juntos no dicen cuál es el camino.
                    </li>
                    <li>
                        <code className="font-mono text-xs">danger</code> es el verbo del diálogo de
                        confirmación y nada más: ni menús, ni barras, ni filas en rojo.
                    </li>
                    <li>
                        <code className="font-mono text-xs">loading</code> además de deshabilitar
                        anuncia: <code className="font-mono text-xs">aria-busy</code> mientras
                        corre, y el nombre accesible no desaparece.
                    </li>
                    <li>
                        Un botón apagado por una causa ajena lleva{' '}
                        <code className="font-mono text-xs">disabledReason</code>: el motivo por el
                        tooltip, no un title nativo que llega tarde y doble.
                    </li>
                    <li>
                        El anillo de foco no se declara aquí: lo pone la hoja de runtime, una vez
                        para todos los controles con borde.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
