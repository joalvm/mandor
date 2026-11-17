const LAYERS: readonly { name: string; token: string }[] = [
    { name: 'z-dialog', token: '--mandor-z-dialog' },
    { name: 'z-popover', token: '--mandor-z-popover' },
    { name: 'z-dropdown', token: '--mandor-z-dropdown' },
    { name: 'z-tooltip', token: '--mandor-z-tooltip' },
    { name: 'z-toast', token: '--mandor-z-toast' },
    { name: 'z-drag', token: '--mandor-z-drag' },
];

const STEP = {
    height: 'h-16',
    width: 'w-44',
} as const;

/**
 * Seis capas apiladas en desplazamiento. Cada caja es el panel con algo de transparencia: la
 * capa de debajo se adivina a través de la que llega después, y el cruce cuenta el apilamiento
 * sin un color sólido que lo esconda ni una veladura que lo tiña todo.
 */
export function ApiladasDemo() {
    return (
        <div className="relative h-52 w-full">
            {LAYERS.map((layer, index) => (
                <div
                    className={`absolute rounded-md border border-border-subtle p-pad-control ${STEP.width} ${STEP.height}`}
                    key={layer.name}
                    style={{
                        left: `${(index * 44).toString()}px`,
                        top: `${(index * 24).toString()}px`,
                        zIndex: `var(${layer.token})`,
                        background: 'color-mix(in srgb, var(--surface-panel) 72%, transparent)',
                    }}
                >
                    <code className="font-mono text-2xs text-text-primary">{layer.name}</code>
                </div>
            ))}
        </div>
    );
}
