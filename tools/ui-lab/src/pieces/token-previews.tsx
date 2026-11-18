/** Las familias de muestra que una tabla de tokens sabe dibujar. */
export type TokenPreview =
    'color' | 'gap' | 'height' | 'pad' | 'radius' | 'shadow' | 'value' | 'width';

function ColorPreview({ token }: { token: string }) {
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

function GapPreview({ token }: { token: string }) {
    return (
        <span aria-hidden="true" className={`flex ${ENVELOPE} items-center`}>
            <span className="h-field flex-1 rounded-sm border border-border-strong" />
            <span
                className="h-field shrink-0 bg-surface-control"
                style={{ width: `var(${token})` }}
            />
            <span className="h-field flex-1 rounded-sm border border-border-strong" />
        </span>
    );
}

function PadPreview({ token }: { token: string }) {
    return (
        <span
            aria-hidden="true"
            className={`flex ${ENVELOPE} items-center rounded-md border border-border-strong`}
            style={{ paddingInline: `var(${token})` }}
        >
            <span className="h-field flex-1 rounded-sm bg-surface-control" />
        </span>
    );
}

function HeightPreview({ token }: { token: string }) {
    return (
        <span aria-hidden="true" className="flex w-16 shrink-0 items-center">
            <span
                className="block w-full rounded-sm bg-solid-accent"
                style={{ height: `var(${token})` }}
            />
        </span>
    );
}

function WidthPreview({ token }: { token: string }) {
    return (
        <span aria-hidden="true" className="flex w-16 shrink-0 items-center">
            <span
                className="block h-2 rounded-sm bg-solid-accent"
                style={{ width: `var(${token})` }}
            />
        </span>
    );
}

function RadiusPreview({ token }: { token: string }) {
    return (
        <span
            aria-hidden="true"
            className="block h-control w-16 shrink-0 border-2 border-border-strong bg-surface-control"
            style={{ borderRadius: `var(${token})` }}
        />
    );
}

function ShadowPreview({ token }: { token: string }) {
    return (
        <span
            aria-hidden="true"
            className="block h-control w-16 shrink-0 rounded-md bg-surface-panel"
            style={{ boxShadow: `var(${token})` }}
        />
    );
}

function ValuePreview({ token }: { token: string }) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();

    return <span className="text-xs text-text-secondary tabular">{value || '—'}</span>;
}

function Preview({ kind, token }: { kind: TokenPreview; token: string }) {
    switch (kind) {
        case 'color':
            return <ColorPreview token={token} />;
        case 'gap':
            return <GapPreview token={token} />;
        case 'height':
            return <HeightPreview token={token} />;
        case 'pad':
            return <PadPreview token={token} />;
        case 'radius':
            return <RadiusPreview token={token} />;
        case 'shadow':
            return <ShadowPreview token={token} />;
        case 'value':
            return <ValuePreview token={token} />;
        case 'width':
            return <WidthPreview token={token} />;
    }
}

export { Preview };
