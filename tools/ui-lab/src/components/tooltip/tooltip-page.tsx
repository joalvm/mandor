import { ApiTable } from '../../pieces/api-table.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { ApagadoDemo } from './apagado.js';
import apagadoCode from './apagado.tsx?raw';
import { BasicoDemo } from './basico.js';
import basicoCode from './basico.tsx?raw';

const TOOLTIP_API = [
    {
        name: 'content',
        type: 'string',
        note: 'El texto entero. Solo texto: un control dentro sería una ventana flotante sin camino.',
    },
    {
        name: 'children',
        type: 'ReactElement',
        note: 'El disparador, tal y como está en su sitio; el tooltip no dibuja nada propio.',
    },
] as const;

const PROVIDER_API = [
    {
        name: 'delayDuration',
        type: 'number',
        def: '400',
        note: 'Lo que espera el primero. Mientras el puntero sigue recorriendo, el siguiente entra al instante.',
    },
] as const;

const APAGADO_API = [
    {
        name: 'reason',
        type: 'string',
        note: 'El motivo sobre un control apagado. Sin motivo no envuelve nada.',
    },
] as const;

/** El texto que falta, flotando sobre lo que lo corta. */
export function TooltipPage() {
    return (
        <DocPage
            lead="El texto que falta, flotando sobre lo que lo corta. Es texto y nada más: no toma
                el foco, no lleva controles y se va con Esc, al salir del disparador o al hacer
                click. El primero espera 400 ms; mientras el puntero sigue recorriendo una barra,
                el siguiente entra al instante."
            title="Tooltip"
        >
            <Demo
                code={basicoCode}
                heading="Sobre lo que ya tiene nombre"
                intent="En el botón repite su label; en el nombre truncado, la celda corta y el tooltip entero."
            >
                <BasicoDemo />
            </Demo>

            <Demo
                code={apagadoCode}
                heading="Sobre un control apagado"
                intent="El botón apagado no se mueve de su sitio: el motivo es el tooltip. El que envuelve es DisabledControlTooltip, porque un control apagado del sistema no recibe el puntero."
            >
                <ApagadoDemo />
            </Demo>

            <DocSection
                heading="API"
                intent="El proveedor vive en la raíz de la ventana, uno solo."
            >
                <ApiTable caption="Props de Tooltip" rows={TOOLTIP_API} />
                <ApiTable caption="Props de TooltipProvider" rows={PROVIDER_API} />
                <ApiTable caption="Props de DisabledControlTooltip" rows={APAGADO_API} />
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Obligatorio en todo <code className="font-mono text-xs">IconButton</code>,
                        con la misma cadena que su label: dos cadenas para un nombre son dos
                        verdades.
                    </li>
                    <li>Solo texto. Lo que necesita un control dentro es un Popover.</li>
                    <li>
                        No va en lo que ya muestra su texto, salvo que esté truncado: el tooltip no
                        repite lo que se lee.
                    </li>
                    <li>
                        Nunca carga la única copia de un dato: quien usa teclado o táctil no lo ve
                        del todo.
                    </li>
                    <li>
                        El foco no se mueve nunca; Esc lo cierra. Abre por hover y también por foco
                        de teclado.
                    </li>
                    <li>
                        Un control apagado no recibe el puntero:{' '}
                        <code className="font-mono text-xs">DisabledControlTooltip</code> lo
                        envuelve y pone el motivo.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
