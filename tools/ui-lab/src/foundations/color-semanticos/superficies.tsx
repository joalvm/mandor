/**
 * Las superficies encajadas como en la aplicación real: app sobre la que se apoya un panel,
 * dentro del cual algo se hunde y algo se alza.
 */
export function SuperficiesDemo() {
    return (
        <div className="flex flex-col gap-gap-group">
            <div className="rounded-lg border border-border-subtle bg-surface-app p-pad-panel">
                <p className="text-2xs text-text-secondary">bg-surface-app — el lienzo</p>
                <div className="mt-1 rounded-md border border-border-subtle bg-surface-panel p-pad-panel">
                    <p className="text-2xs text-text-secondary">bg-surface-panel — el panel</p>
                    <div className="mt-1 flex h-field items-center rounded-md border border-border-subtle bg-surface-sunken px-pad-control">
                        <p className="text-2xs text-text-secondary">
                            bg-surface-sunken — el código
                        </p>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-gap-group">
                <div className="flex h-section w-44 items-center justify-center rounded-md border border-border-subtle bg-surface-raised">
                    <p className="text-2xs text-text-secondary">bg-surface-raised</p>
                </div>
                <div className="flex h-section w-44 items-center justify-center rounded-md border border-border-chrome bg-surface-dialog">
                    <p className="text-2xs text-text-secondary">bg-surface-dialog</p>
                </div>
                <div className="flex h-section w-44 items-center justify-center rounded-md bg-surface-overlay px-pad-control">
                    <p className="text-2xs text-text-on-solid-accent">bg-surface-overlay</p>
                </div>
            </div>
        </div>
    );
}
