import type { EnvironmentSelect } from '@mandor/env';

type Environment = Parameters<typeof EnvironmentSelect>[0]['options'][number];

/** Un entorno de muestra: `base_url` resuelve, lo demás queda por declarar. */
export const ENTORNO: Environment = {
    id: 'local',
    name: 'Local',
    variables: [
        { enabled: true, name: 'base_url', secret: false, value: 'https://api.local/' },
        { enabled: true, name: 'token', secret: true, value: 'abc' },
    ],
};

/** Otro entorno, para que el selector tenga entre qué elegir: aquí `base_url` no existe. */
export const STAGING: Environment = {
    id: 'staging',
    name: 'Staging',
    variables: [],
};
