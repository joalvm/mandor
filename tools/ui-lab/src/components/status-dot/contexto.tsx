import { StatusDot } from '@mandor/ui';

/** El punto en la fila que lo llevó a existir: nombre, estado y nada de color solitario. */
export function ContextoDemo() {
    return (
        <div className="flex min-w-0 flex-col gap-gap-tight">
            <div className="flex h-row min-w-0 items-center gap-gap-control rounded-md px-pad-control">
                <StatusDot label="Conectada" state="connected" />
                <span className="truncate text-sm text-text-primary">gateway.prod</span>
            </div>
            <div className="flex h-row min-w-0 items-center gap-gap-control rounded-md px-pad-control">
                <StatusDot label="Conectando" state="connecting" />
                <span className="truncate text-sm text-text-primary">gateway.staging</span>
            </div>
        </div>
    );
}
