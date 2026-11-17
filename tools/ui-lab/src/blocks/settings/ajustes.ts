import type { SettingsInheritanceWords } from '@mandor/ui';

/** Lo que dice la línea bajo una fila que sigue los valores por defecto de la app. */
export const PALABRAS: SettingsInheritanceWords = {
    caption: 'Por defecto en',
    onFollow: () => undefined,
    place: 'Ajustes',
    resetLabel: 'Usar el valor por defecto',
};

/** Los ajustes de una petición de Mandor Request: los siete que el envío usa. */
export type AjustesPeticion = {
    followRedirects: boolean;
    httpVersion: string;
    keepMethodOnRedirect: boolean;
    maxRedirects: number;
    timeoutMs: number;
    useCookieJar: boolean;
    validateTls: boolean;
};

/** Los de fábrica, hasta que la app guarda los suyos. */
export const PETICION_DE_FABRICA: AjustesPeticion = {
    followRedirects: true,
    httpVersion: 'auto',
    keepMethodOnRedirect: false,
    maxRedirects: 5,
    timeoutMs: 30000,
    useCookieJar: true,
    validateTls: true,
};

/** Cómo vuelve una conexión de Mandor Realtime cuando el servidor cuelga. */
export type Reintento = {
    attempts: number;
    enabled: boolean;
    initialWaitMs: number;
    maximumWaitMs: number;
    spread: number;
};

/** Cómo prueba una conexión que sigue viva mientras nadie habla. */
export type Latido = {
    enabled: boolean;
    intervalMs: number;
    pongTimeoutMs: number;
};
