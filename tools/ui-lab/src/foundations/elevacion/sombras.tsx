/** Las cuatro sombras sobre la superficie de lo que flota: lo que flota se distingue por su sombra, no por su borde. */
export function SombrasDemo() {
    return (
        <div className="flex flex-wrap items-center gap-gap-section py-gap-group">
            {[
                { cls: 'shadow-none', name: 'shadow-none', use: 'pegado a su superficie' },
                { cls: 'shadow-popover', name: 'shadow-popover', use: 'lo que flota cerca' },
                { cls: 'shadow-dialog', name: 'shadow-dialog', use: 'lo que flota lejos' },
                { cls: 'shadow-drag', name: 'shadow-drag', use: 'lo que se arrastra' },
            ].map((step) => (
                <div className="flex flex-col items-center gap-gap-control" key={step.cls}>
                    <div
                        className={`h-section w-44 rounded-lg border border-border-subtle bg-surface-raised ${step.cls}`}
                    />
                    <div className="text-center">
                        <code className="font-mono text-2xs text-text-primary">{step.name}</code>
                        <p className="text-xs text-text-secondary">{step.use}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
