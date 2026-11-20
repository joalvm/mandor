import {
    Button,
    Dialog,
    DialogBody,
    DialogFooter,
    DialogNav,
    DialogNavItem,
    DialogNavList,
} from '@mandor/ui';
import { useState, type ReactElement } from 'react';

const SECCIONES = [
    { icon: 'settings', id: 'general', label: 'General' },
    { icon: 'edit', id: 'editor', label: 'Editor' },
    { icon: 'color-mode', id: 'apariencia', label: 'Apariencia' },
] as const;

type Seccion = (typeof SECCIONES)[number];

function detalle(seccion: Seccion): ReactElement {
    if (seccion.id === 'general') {
        return <p>El idioma de la interfaz y el comportamiento de las pestañas.</p>;
    }

    if (seccion.id === 'editor') {
        return <p>El ancho de línea, el ajuste y el tamaño del texto del editor.</p>;
    }

    return <p>El tema de la ventana y el acento de la selección.</p>;
}

/**
 * El diálogo con columna de secciones: 880 × 700, marco quieto mientras se cambia de sección.
 * La lista es la dueña de las flechas y solo la sección abierta entra en el orden de
 * tabulación.
 */
export function SeccionesDemo(): ReactElement {
    const [open, setOpen] = useState(false);
    const [abierta, setAbierta] = useState<Seccion['id']>('general');
    const actual = SECCIONES.find((seccion) => seccion.id === abierta);

    return (
        <div className="flex flex-col items-center gap-gap-control">
            <Button
                variant="secondary"
                onClick={() => {
                    setOpen(true);
                }}
            >
                Preferencias
            </Button>
            {/* modal-policy: short-config-form — la columna de secciones del formulario corto. */}
            <Dialog closeLabel="Cerrar" onOpenChange={setOpen} open={open} title="Preferencias">
                <DialogNav>
                    <DialogNavList label="Secciones">
                        {SECCIONES.map((seccion) => (
                            <DialogNavItem
                                icon={seccion.icon}
                                key={seccion.id}
                                label={seccion.label}
                                selected={seccion.id === abierta}
                                onSelect={() => {
                                    setAbierta(seccion.id);
                                }}
                            />
                        ))}
                    </DialogNavList>
                </DialogNav>
                <DialogBody>
                    <h2 className="text-sm font-semibold">{actual?.label}</h2>
                    {actual === undefined ? null : detalle(actual)}
                </DialogBody>
                <DialogFooter>
                    <Button
                        onClick={() => {
                            setOpen(false);
                        }}
                    >
                        Hecho
                    </Button>
                </DialogFooter>
            </Dialog>
        </div>
    );
}
