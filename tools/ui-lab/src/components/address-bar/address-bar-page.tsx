import { ApiTable } from '../../pieces/api-table.js';
import { Demo } from '../../pieces/demo.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { ConexionDemo } from './conexion.js';
import conexionCode from './conexion.tsx?raw';
import { PeticionDemo } from './peticion.js';
import peticionCode from './peticion.tsx?raw';

const ADDRESS_BAR_API = [
    {
        name: 'children',
        type: 'ReactNode',
        note: 'Las partes, en orden. Entre dos que pintan algo, una costura; un null no deja ninguna.',
    },
    { name: 'className', type: 'string', note: 'Solo para el ancho dentro de su banda.' },
    {
        name: 'invalid',
        type: 'boolean',
        note: 'Una parte lleva lo que no puede salir así: la barra lo dice en su única línea.',
    },
] as const;

const METHOD_PICKER_API = [
    {
        name: 'value',
        type: 'string',
        note: 'El verbo en vigor; se lista aunque no esté en methods.',
    },
    { name: 'methods', type: 'readonly string[]', note: 'Los verbos que ofrece la lista.' },
    { name: 'onValueChange', type: '(method: string) => void', note: 'Verbo elegido o escrito.' },
    {
        name: 'accepts',
        type: '(method: string) => boolean',
        note: 'La gramática del verbo es del dueño. Si rechaza, el campo sigue abierto y marcado.',
    },
    { name: 'label', type: 'string', note: 'Nombre accesible del disparador, seguido del verbo.' },
    { name: 'otherLabel', type: 'string', note: 'La última línea, la que abre el campo propio.' },
    { name: 'otherField', type: 'string', note: 'Nombre accesible de ese campo.' },
] as const;

/** Un control hecho de varios: con qué se marca y adónde, fundidos como una barra de dirección. */
export function AddressBarPage() {
    return (
        <DocPage
            lead="Lo que marca un destino —un verbo, un entorno, un namespace— y la dirección,
                fundidos en una sola caja. La barra es dueña del borde, la superficie y el foco: la
                parte que tiene el foco recolorea la única línea que las rodea a todas."
            title="AddressBar"
        >
            <Demo
                code={peticionCode}
                heading="Petición"
                intent="MethodPicker con el verbo en su tono, costura, la URL con sus variables y «Código» dentro del borde."
                layout="start"
            >
                <PeticionDemo />
            </Demo>

            <Demo
                code={conexionCode}
                heading="Conexión"
                intent="EnvironmentSelect y el namespace como partes; la barra pone las costuras."
                layout="start"
            >
                <ConexionDemo />
            </Demo>

            <DocSection heading="API" intent="AddressBar solo une; cada parte trae lo suyo.">
                <ApiTable caption="Props de AddressBar" rows={ADDRESS_BAR_API} />
                <ApiTable caption="Props de MethodPicker" rows={METHOD_PICKER_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Se compone como un árbol: <code>AddressBar</code> y dentro sus partes, sin
                        ranuras ni funciones que pinten. La dirección es siempre{' '}
                        <code>AddressField</code>, la misma en las dos apps.
                    </li>
                    <li>
                        Dentro, nadie dibuja caja: el campo va sin borde y el selector como botón
                        fantasma.
                    </li>
                    <li>
                        Lo que actúa sobre la dirección —verla como código— va al final, en{' '}
                        <code>AddressEnd</code>, como botón de icono y sin costura delante.
                    </li>
                    <li>
                        La dirección se escribe en la fuente de la interfaz, no en monoespaciada: la
                        variable y el texto se leen como una sola línea.
                    </li>
                    <li>
                        Enviar o conectar quedan fuera de la barra: el destino es una cosa y la
                        orden otra.
                    </li>
                    <li>
                        Un verbo que la lista no conoce se escribe en el sitio del verbo, no en un
                        diálogo.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
