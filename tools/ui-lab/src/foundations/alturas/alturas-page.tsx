import controlesCode from './controles.tsx?raw';
import { ControlesDemo } from './controles.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TokenTable } from '../../pieces/token-table.js';
import { HEIGHTS, WIDTHS } from './alturas-tokens.js';

export function AlturasPage() {
    return (
        <DocPage
            lead="La altura no se adivina: se pide. Dieciocho escalones cubren todo lo que la interfaz
                dibuja, de un microcontrol a la barra de título, y el ancho pertenece a quien
                coloca, no al control. Esta es la página que intraled no necesitó y Mandor sí."
            title="Alturas"
        >
            <Demo
                code={controlesCode}
                heading="Controles reales"
                intent="El botón normal, el compacto, la caja de campo y una fila de lista, en sus alturas de verdad."
                layout="start"
            >
                <ControlesDemo />
            </Demo>

            <DocSection
                heading="Las dieciocho alturas"
                intent="De chico a grande en la densidad cómoda. La muestra es la altura misma, y el valor cambia con la densidad: pásala a compacta desde Apariencia."
            >
                <TokenTable caption="Las dieciocho alturas" preview="height" rows={HEIGHTS} />
            </DocSection>

            <DocSection
                heading="Los anchos"
                intent="Laterales, pestañas, avisos, columnas y diálogos. El resto del ancho lo decide la rejilla que coloca."
            >
                <TokenTable caption="Los anchos" preview="width" rows={WIDTHS} />
            </DocSection>

            <DocSection
                heading="Las barras de desplazamiento"
                intent="Heredadas desde la raíz: thin y del color del borde al pasar. Ningún panel declara la suya."
            >
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        <code className="font-mono text-xs">scrollbar-width: thin</code> y{' '}
                        <code className="font-mono text-xs">scrollbar-color</code> se declaran una
                        vez en <code className="font-mono text-xs">base.css</code> y heredan a toda
                        caja que desborde.
                    </li>
                    <li>
                        Esta página ya las lleva: el lateral y el contenido usan la misma barra.
                    </li>
                </ul>
            </DocSection>

            <DocSection heading="Reglas">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        La altura se pide con la utilidad del escalón, no con una clase
                        <code className="font-mono text-xs"> h-7</code> encima: un escalón nuevo es
                        un token, no una excepción.
                    </li>
                    <li>
                        Un control no elige su ancho: ocupa todo el que le den, y quien lo coloca
                        decide con la rejilla.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
