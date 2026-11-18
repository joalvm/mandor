import { FolderIcon } from '@mandor/icons';
import { MethodMark } from '@mandor/ui';

const PETICIONES = [
    { method: 'POST', name: 'Login' },
    { method: 'DELETE', name: 'Logout' },
    { method: 'GET', name: 'Get Profile' },
    { method: 'OPTIONS', name: 'Preflight' },
    { method: 'PATCH', name: 'Update avatar' },
] as const;

/**
 * La forma corta. La lista le da una ranura fija, alineada a la derecha, para que los nombres
 * empiecen en una columna; la pestaña la lleva a su ancho, donde otra lleva su glifo.
 */
export function CompactoDemo() {
    return (
        <ul className="m-0 flex w-64 list-none flex-col bg-surface-panel p-0 text-sm">
            <li className="flex h-row items-center gap-gap-icon-text px-pad-panel">
                <FolderIcon size="sm" />
                <span className="truncate">Session</span>
            </li>
            {PETICIONES.map((peticion) => (
                <li
                    className="flex h-row items-center gap-gap-icon-text px-pad-panel"
                    key={peticion.name}
                >
                    <span className="flex w-8 shrink-0 items-center justify-end">
                        <MethodMark compact method={peticion.method} />
                    </span>
                    <span className="truncate">{peticion.name}</span>
                </li>
            ))}
        </ul>
    );
}
