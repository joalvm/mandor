import estadosCode from './estados.tsx?raw';
import { EstadosDemo } from './estados.js';
import { BORDERS, FOCUS, SOLIDS, TEXTS } from './senales-tokens.js';
import superficiesCode from './superficies.tsx?raw';
import { SuperficiesDemo } from './superficies.js';
import { SURFACES, TINTS } from './superficies-tokens.js';
import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';
import { Demo } from '../../pieces/demo.js';
import { TokenTable } from '../../pieces/token-table.js';

export function ColorSemanticosPage() {
    return (
        <DocPage
            lead="La capa que se escribe: un juego de nombres que dicen el papel y no el color. En
                claro y en oscuro la variable se llama igual, así que un componente no sabe en qué
                tema vive."
            title="Color — semánticos"
        >
            <Demo
                code={superficiesCode}
                heading="Las superficies, encajadas"
                intent="App sobre la que se apoya un panel; dentro del panel, algo se hunde y algo se alza."
            >
                <SuperficiesDemo />
            </Demo>

            <DocSection heading="Superficies">
                <TokenTable caption="Superficies" preview="color" rows={SURFACES} />
            </DocSection>

            <DocSection
                heading="Tintes, selección y línea activa"
                intent="El tinte es fondo de señal, nunca de estructura: un Badge lo lleva, un panel no."
            >
                <TokenTable
                    caption="Tintes, selección y línea activa"
                    preview="color"
                    rows={TINTS}
                />
            </DocSection>

            <Demo
                code={estadosCode}
                heading="Los estados, vivos"
                intent="Señal con texto o icono al lado del color; el rojo de intención solo en el verbo destructivo."
            >
                <EstadosDemo />
            </Demo>

            <DocSection heading="Texto">
                <TokenTable caption="Texto" preview="color" rows={TEXTS} />
            </DocSection>

            <DocSection
                heading="Bordes"
                intent="El borde va siempre acompañado de border-line-*: a secas hereda el color del texto. El hover es el único que no se escribe en reposo."
            >
                <TokenTable caption="Bordes" preview="color" rows={BORDERS} />
            </DocSection>

            <DocSection
                heading="Sólidos"
                intent="El relleno fuerte del acento y de los estados. El peligroso tiene pasos propios de hover y de activo, fuera de su rampa."
            >
                <TokenTable caption="Sólidos" preview="color" rows={SOLIDS} />
            </DocSection>

            <DocSection
                heading="Foco"
                intent="El anillo no es un color de más: es el borde del control, pintado de acento. El runtime lo escribe una vez; aquí solo se ve el token."
            >
                <TokenTable caption="Foco" preview="value" rows={FOCUS} />
            </DocSection>
        </DocPage>
    );
}
