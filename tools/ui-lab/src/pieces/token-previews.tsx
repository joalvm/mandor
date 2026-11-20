import type { ComponentType } from 'react';

/** Las familias de muestra que una tabla de tokens sabe dibujar. */
export type TokenPreview = 'color' | 'gap' | 'height' | 'pad' | 'radius' | 'width';

type PreviewProps = { token: string };

function ColorPreview({ token }: PreviewProps) {
    return (
        <span
            aria-hidden="true"
            className="block h-control w-16 shrink-0 rounded-sm border border-border-subtle"
            style={{ background: `var(${token})` }}
        />
    );
}

/**
 * El sobre de las muestras de hueco y de pad es fijo: todas miden lo mismo, las cajas ceden y
 * lo único que crece es el espacio que el token nombra.
 */
const ENVELOPE = 'w-24';

function GapPreview({ token }: PreviewProps) {
    return (
        <span aria-hidden="true" className={`flex ${ENVELOPE} items-center`}>
            <span className="h-field flex-1 rounded-sm border border-border-subtle" />
            <span
                className="h-field shrink-0 bg-surface-control-active"
                style={{ width: `var(${token})` }}
            />
            <span className="h-field flex-1 rounded-sm border border-border-subtle" />
        </span>
    );
}

function PadPreview({ token }: PreviewProps) {
    return (
        <span
            aria-hidden="true"
            className={`flex ${ENVELOPE} items-center rounded-md border border-border-subtle`}
            style={{ paddingInline: `var(${token})` }}
        >
            <span className="h-field flex-1 rounded-sm bg-surface-control-active" />
        </span>
    );
}

function HeightPreview({ token }: PreviewProps) {
    return (
        <span aria-hidden="true" className="flex w-16 shrink-0 items-center">
            <span
                className="block w-full rounded-sm bg-surface-control-active"
                style={{ height: `var(${token})` }}
            />
        </span>
    );
}

function WidthPreview({ token }: PreviewProps) {
    return (
        <span aria-hidden="true" className="flex w-16 shrink-0 items-center overflow-hidden">
            <span
                className="block h-2 shrink-0 rounded-sm bg-surface-control-active"
                style={{ width: `var(${token})` }}
            />
        </span>
    );
}

function RadiusPreview({ token }: PreviewProps) {
    return (
        <span
            aria-hidden="true"
            className="block h-control w-16 shrink-0 border-2 border-border-subtle bg-surface-control"
            style={{ borderRadius: `var(${token})` }}
        />
    );
}

/** Cada familia con la pieza que la dibuja. */
const PREVIEWS: Record<TokenPreview, ComponentType<PreviewProps>> = {
    color: ColorPreview,
    gap: GapPreview,
    height: HeightPreview,
    pad: PadPreview,
    radius: RadiusPreview,
    width: WidthPreview,
};

export function Preview({ kind, token }: { kind: TokenPreview; token: string }) {
    const Drawn = PREVIEWS[kind];

    return <Drawn token={token} />;
}
