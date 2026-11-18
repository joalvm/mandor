import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { ActivaDemo } from './activa.js';
import activaCode from './activa.tsx?raw';
import { TamanosDemo } from './tamanos.js';
import tamanosCode from './tamanos.tsx?raw';

const ICON_BUTTON_API = [
    {
        name: 'icon',
        type: 'IconName',
        note: 'El glifo es el control: aquí sí viaja como prop, y es obligatorio.',
    },
    {
        name: 'label',
        type: 'string',
        note: 'El nombre accesible y el texto del tooltip; nunca title nativo.',
    },
    {
        name: 'size',
        type: "'xs' | 'sm' | 'md'",
        def: 'sm',
        note: 'Cuadrados sobre size-icon-md, size-control-sm y size-control.',
    },
    {
        name: 'active',
        type: 'boolean',
        def: 'false',
        note: 'Estado pulsado: relleno de selección y aria-pressed para el lector.',
    },
    {
        name: 'iconSize',
        type: "'sm' | 'md'",
        def: 'md',
        note: 'El tamaño del glifo es una decisión aparte del tamaño del control.',
    },
    {
        name: 'disabled',
        type: 'boolean',
        def: 'false',
        note: 'Con disabledReason dice el motivo por el tooltip.',
    },
] as const;

/** El botón de un solo glifo: el icono es el control y la etiqueta no se ve, se anuncia. */
export function IconButtonPage() {
    return (
        <DocPage
            lead="La acción compacta de una banda. Aquí el glifo sí viaja como prop, porque el glifo es el
                control — es la excepción a la regla de composición. Sin texto visible, la etiqueta
                trabaja doble: nombra el botón para el lector de pantalla y alimenta el tooltip."
            title="IconButton"
        >
            <Demo
                code={tamanosCode}
                heading="Tamaños"
                intent="Tres cuadrados de la escala; apunta a cada uno y verás la etiqueta en el tooltip del sistema."
                layout="stretch"
            >
                <TamanosDemo />
            </Demo>

            <Demo
                code={activaCode}
                heading="Pulsado y apagado"
                intent="El pulsado se anuncia con aria-pressed, no con color solo. El apagado con motivo lo dice en su tooltip."
                layout="start"
            >
                <ActivaDemo />
            </Demo>

            <DocSection heading="API" intent="Las props propias; el resto viajan al button nativo.">
                <ApiTable caption="Props de IconButton" rows={ICON_BUTTON_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        <code className="font-mono text-xs">label</code> obligatorio: un botón sin
                        nombre no existe para un lector de pantalla.
                    </li>
                    <li>
                        La etiqueta es lo que hace, no lo que es: «Grabar», no «Botón de grabación».
                    </li>
                    <li>
                        El tamaño del glifo y el del control se deciden por separado:{' '}
                        <code className="font-mono text-xs">iconSize</code> y{' '}
                        <code className="font-mono text-xs">size</code>.
                    </li>
                    <li>
                        Bajo la cabecera de una sección el botón toma la caja compacta, el glifo
                        pequeño y la tinta secundaria, pida lo que pida: la cabecera decide, y los
                        botones quedan pegados contra el borde final.
                    </li>
                    <li>
                        <code className="font-mono text-xs">active</code> para el estado conmutado,
                        con <code className="font-mono text-xs">aria-pressed</code>; el color no
                        basta solo.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
