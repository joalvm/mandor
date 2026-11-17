import type { ThemeRegistrationRaw } from 'shiki';

/**
 * La paleta de sintaxis del visor de código —comentario secundario, cadena verde, palabra clave
 * roja, etiqueta azul— escrita con las variables semánticas: el visor cambia de tema con la
 * página, sin una segunda fuente de verdad.
 */
export const CODE_THEME: ThemeRegistrationRaw = {
    name: 'mandor-lab',
    type: 'dark',
    colors: {
        'editor.background': 'transparent',
        'editor.foreground': 'var(--text-primary)',
    },
    settings: [
        { scope: ['comment'], settings: { foreground: 'var(--text-secondary)' } },
        {
            scope: ['delimiter', 'meta', 'operator', 'punctuation'],
            settings: { foreground: 'var(--text-secondary)' },
        },
        { scope: ['string'], settings: { foreground: 'var(--text-success)' } },
        { scope: ['string.key'], settings: { foreground: 'var(--text-info)' } },
        {
            scope: [
                'constant.character.escape',
                'constant.numeric',
                'string.escape',
                'attribute.name',
                'entity.other.attribute-name',
            ],
            settings: { foreground: 'var(--text-warning)' },
        },
        {
            scope: ['keyword', 'storage.type', 'storage.modifier'],
            settings: { foreground: 'var(--text-error)' },
        },
        { scope: ['tag', 'entity.name.tag'], settings: { foreground: 'var(--text-info)' } },
        { scope: ['attribute.value'], settings: { foreground: 'var(--text-success)' } },
        { scope: ['variable'], settings: { foreground: 'var(--text-variable)' } },
        { scope: ['invalid'], settings: { foreground: 'var(--text-error)' } },
    ],
};
