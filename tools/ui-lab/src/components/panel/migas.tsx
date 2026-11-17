import { HttpIcon } from '@mandor/icons';
import { Breadcrumbs } from '@mandor/ui';

/**
 * Dónde vive lo que se mira, como texto: sin historia y sin nada que tocar.
 * Cada tramo trunca por su cuenta, así que una ruta honda se encoge en vez de salirse. Delante,
 * la marca de lo que la ruta nombra —el protocolo de una petición— en su propio tono.
 */
export function MigasDemo() {
    return (
        <div className="flex flex-col gap-gap-control">
            <div className="flex h-section items-center bg-surface-panel px-pad-panel">
                <Breadcrumbs
                    label="Ubicación de la petición"
                    parts={['Invian', 'Session', 'Login']}
                >
                    <span className="flex items-center text-text-info">
                        <HttpIcon />
                    </span>
                </Breadcrumbs>
            </div>
            <div className="flex h-section items-center bg-surface-panel px-pad-panel">
                <Breadcrumbs
                    label="Ubicación de la conexión"
                    parts={['gateway-local', 'eventos', 'device-request']}
                />
            </div>
            <div className="flex h-section items-center bg-surface-panel px-pad-panel">
                <Breadcrumbs
                    label="Ubicación con tramos largos"
                    parts={['gateway-local-produccion-este', 'eventos', 'device-request-reintento']}
                />
            </div>
        </div>
    );
}
