import { Card } from '@mandor/ui';

/**
 * Una pestaña de Request en miniatura: el destino mide lo suyo arriba y la pareja de abajo se
 * reparte el resto. Las tres tarjetas se apoyan en el marco y el hueco del marco las separa.
 */
export function MarcoDemo() {
    return (
        <div className="flex h-72 flex-col gap-gap-gutter">
            <Card aria-label="Destino" size="content">
                <p className="flex h-header items-center px-pad-panel text-sm text-text-primary">
                    GET https://api.example.com/users
                </p>
            </Card>
            <div className="flex min-h-0 flex-1 gap-gap-gutter">
                <Card aria-label="Petición">
                    <p className="p-pad-panel text-sm text-text-secondary">
                        Params · Headers · Body
                    </p>
                </Card>
                <Card aria-label="Respuesta">
                    <p className="p-pad-panel text-sm text-text-secondary">200 OK · 120 ms</p>
                </Card>
            </div>
        </div>
    );
}
