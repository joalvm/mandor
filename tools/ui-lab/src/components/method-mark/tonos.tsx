import { MethodMark } from '@mandor/ui';

const VERBOS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'PURGE'] as const;

/** Cada verbo con su tono; el que la lista no conoce se lee como texto normal. */
export function TonosDemo() {
    return (
        <div className="flex flex-wrap items-center gap-gap-control font-semibold">
            {VERBOS.map((verbo) => (
                <MethodMark key={verbo} method={verbo} />
            ))}
        </div>
    );
}
