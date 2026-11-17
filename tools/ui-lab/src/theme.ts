/**
 * El conmutador de tema del lab repite el mecanismo de `PreferencesApplication` en `@mandor/prefs`:
 * un atributo `data-theme` en la raíz del documento, y quitado para seguir al sistema. Mismas
 * hojas, mismas variables: lo que cambia de tema aquí cambia de tema en las apps.
 */
export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'ui-lab.theme';

const CHOICES: readonly ThemeChoice[] = ['system', 'light', 'dark'];

export function readStoredTheme(): ThemeChoice {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const choice = CHOICES.find((candidate) => candidate === stored);

        return choice ?? 'system';
    } catch {
        return 'system';
    }
}

function applyTheme(choice: ThemeChoice): void {
    const root = document.documentElement;

    if (choice === 'system') {
        root.removeAttribute('data-theme');
    } else {
        root.dataset['theme'] = choice;
    }
}

export function applyStoredTheme(): void {
    applyTheme(readStoredTheme());
}

export function storeTheme(choice: ThemeChoice): void {
    applyTheme(choice);

    try {
        localStorage.setItem(STORAGE_KEY, choice);
    } catch {
        // Sin almacenamiento, el tema vive solo en esta vista.
    }
}
