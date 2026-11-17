import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { BasicoDemo } from './basico.js';
import basicoCode from './basico.tsx?raw';
import { EstadosDemo } from './estados.js';
import estadosCode from './estados.tsx?raw';
import { VariantesDemo } from './variantes.js';
import variantesCode from './variantes.tsx?raw';

const INPUT_API = [
    {
        name: 'value',
        type: 'string',
        note: 'Controlado siempre: el texto vive en la feature, no en el campo.',
    },
    { name: 'onValueChange', type: '(value: string) => void', note: 'Cada cambio del contenido.' },
    { name: 'label', type: 'string', note: 'El nombre accesible de la línea.' },
    {
        name: 'placeholder',
        type: 'string',
        note: 'La muestra del formato; nunca sustituye a la etiqueta.',
    },
    { name: 'unit', type: 'string', note: 'La unidad, dentro de la caja y nunca editable.' },
    {
        name: 'variant',
        type: "'flat' | 'text'",
        def: 'text',
        note: 'La caja hundida de siempre, o la línea plana para dentro de otra caja.',
    },
    {
        name: 'segments',
        type: 'readonly InputSegment[]',
        note: 'Rangos pintados sobre el valor; el texto debajo no cambia.',
    },
    {
        name: 'onPasteText',
        type: '(text: string) => boolean',
        note: 'Ve el pegado antes de que caiga; true significa que ya lo tomó quien llama.',
    },
] as const;

/** La línea de texto: la caja que la sostiene y nada más. */
export function InputPage() {
    return (
        <DocPage
            lead="Una línea de texto en la caja que le pertenece. El campo es caja y línea, y nada más:
                no hay ranura a ningún lado. Un campo que aceptara lo que sea tendría tantas
                variantes como ideas tuvieron quienes lo llenaron; el glifo que define a un campo
                vive dentro del componente que lo posee — mira SearchInput."
            title="Input"
        >
            <Demo
                code={basicoCode}
                heading="El canónico"
                intent="Dentro de Field: id, mensaje e invalid llegan por cableado. Haz clic en el padding: la caja manda el foco a la línea."
                layout="stretch"
            >
                <BasicoDemo />
            </Demo>

            <Demo
                code={variantesCode}
                heading="Las dos cajas"
                intent="La hundida para un campo suelto; la plana para la línea que vive dentro de otra caja."
                layout="stretch"
            >
                <VariantesDemo />
            </Demo>

            <Demo
                code={estadosCode}
                heading="Estados y unidad"
                intent="El placeholder muestra el formato; la unidad va dentro de la caja y no se escribe."
                layout="stretch"
            >
                <EstadosDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="Las props propias; dentro de Field, id, invalid y describedBy llegan por cableado y las manuales ganan."
            >
                <ApiTable caption="Props de Input" rows={INPUT_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Controlado siempre: <code className="font-mono text-xs">value</code> +{' '}
                        <code className="font-mono text-xs">onValueChange</code>; el campo no guarda
                        nada.
                    </li>
                    <li>
                        Sin ranuras laterales: el glifo que define un campo va dentro de su
                        componente.
                    </li>
                    <li>
                        La unidad viaja dentro de la caja (
                        <code className="font-mono text-xs">unit</code>) y nunca viaja dentro del
                        valor.
                    </li>
                    <li>El padding es parte del campo: un clic en él pone el caret en la línea.</li>
                    <li>
                        Para buscar está{' '}
                        <a className="text-text-accent" href="#/components/input">
                            SearchInput
                        </a>
                        ; para renombrar en el sitio, InlineNameInput. Ninguno de los dos es Input
                        con un icono colgado.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
