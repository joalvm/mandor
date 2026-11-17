import { StatusDot } from '@mandor/ui';

const ESTADOS = [
    { label: 'Conectada', state: 'connected' },
    { label: 'Conectando', state: 'connecting' },
    { label: 'Desconectada', state: 'disconnected' },
    { label: 'Error', state: 'error' },
] as const;

/** Los cuatro estados, cada uno con su nombre debajo: el color nunca trabaja solo. */
export function EstadosDemo() {
    return (
        <div className="grid grid-cols-4 gap-gap-group">
            {ESTADOS.map(({ label, state }) => (
                <div className="flex flex-col items-center gap-gap-tight" key={state}>
                    <StatusDot label={label} state={state} />
                    <span className="text-2xs text-text-secondary">{label}</span>
                </div>
            ))}
        </div>
    );
}
