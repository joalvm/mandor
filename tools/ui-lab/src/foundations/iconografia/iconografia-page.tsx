import * as glyph from '@mandor/icons';
import { AddIcon, type IconComponent } from '@mandor/icons';

import { DocPage } from '../../pieces/doc-page.js';
import { DocSection } from '../../pieces/doc-section.js';

/** Lo que el barril exporta y pinta un glifo: todo menos el genérico Icon, que lleva name. */
type GlyphName = Exclude<keyof typeof glyph, 'Icon'>;

function isGlyphName(name: string): name is GlyphName {
    return name !== 'Icon' && Object.hasOwn(glyph, name);
}

/** Los nombres del barril que pintan un glifo, en orden. */
const NAMES = Object.keys(glyph).filter(isGlyphName).sort();

export function IconografiaPage() {
    return (
        <DocPage
            lead="Un solo juego de glifos para las dos apps, dibujados a una rejilla de 16 con trazo
                de un píxel y tres tamaños. Cada glifo es un componente de apariencia: recibe
                tamaño y color, nunca geometría ni comportamiento."
            title="Iconografía"
        >
            <DocSection
                heading="El registro"
                intent="Todo lo que exporta @mandor/icons, con el nombre con que se importa. La muestra pinta con el color del texto que le toca."
            >
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-gap-control">
                    {NAMES.map((name) => {
                        const Glyph: IconComponent = glyph[name];

                        return (
                            <li
                                className="flex items-center gap-gap-control rounded-md border border-border-subtle bg-surface-card px-pad-control py-gap-control"
                                key={name}
                            >
                                <Glyph size="md" />
                                <span className="truncate text-xs text-text-secondary">
                                    {name.replace(/Icon$/, '')}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </DocSection>

            <DocSection
                heading="Los tres tamaños"
                intent="12, 16 y 24 px, con los nombres de los tokens que miden. Un icono no recibe un número de píxeles."
            >
                <div className="flex items-end gap-gap-section">
                    {(['sm', 'md', 'lg'] as const).map((size) => (
                        <div className="flex flex-col items-center gap-gap-tight" key={size}>
                            <AddIcon size={size} />
                            <code className="font-mono text-2xs text-text-secondary">{size}</code>
                        </div>
                    ))}
                </div>
            </DocSection>

            <DocSection heading="El perfil de dibujo">
                <ul className="flex list-disc flex-col gap-gap-tight pl-4 text-sm text-text-secondary">
                    <li>
                        Trazo de un píxel, coords de 1 a 15, sin curvas raras: solo M, L, C y Z.
                    </li>
                    <li>
                        El viento es común: dos glifos que dicen lo mismo en las dos apps no pueden
                        mirar a lados opuestos.
                    </li>
                    <li>
                        Las marcas de otros (GitHub, Azure…) viven junto a la app que las cita; no
                        entran en el juego común.
                    </li>
                    <li>
                        El registro se genera: los glifos viven en{' '}
                        <code className="font-mono text-xs">packages/icons/src/glyph/</code>, el
                        manifiesto es <code className="font-mono text-xs">icon-sources.json</code>,
                        y <code className="font-mono text-xs">npm run icons</code> reescribe el
                        barril.
                    </li>
                </ul>
            </DocSection>
        </DocPage>
    );
}
