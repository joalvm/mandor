import { HexView } from '@mandor/ui';

const ETIQUETAS = {
    bytesPerRow: 'Bytes por línea',
    copy: 'Copiar el vuelco',
    editor: 'Trama recibida',
    hideText: 'Ocultar el texto',
    showText: 'Mostrar el texto',
};

const PALABRA = new TextEncoder().encode('hola gateway');

/** Una trama de verdad: saludo en claro, un salto y bytes de control que no deletrean nada. */
const TRAMA = new Uint8Array([
    ...PALABRA,
    0x00,
    0x01,
    0x02,
    0xff,
    0x0d,
    0x0a,
    0xfe,
    ...new TextEncoder().encode(' Mandor'),
]);

/** La vista de una trama que nunca fue texto: la banda manda y el vuelco es solo lectura. */
export function Trama() {
    return (
        <div className="h-56 overflow-hidden rounded-md">
            <HexView bytes={TRAMA} labels={ETIQUETAS} modelKey="lab-trama" />
        </div>
    );
}
