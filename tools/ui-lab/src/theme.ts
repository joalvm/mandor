/**
 * La apariencia del lab repite el mecanismo de `PreferencesApplication` en `@mandor/prefs`: tres
 * atributos en la raíz del documento —`data-theme`, `data-density` y `data-motion`—, y el tema y
 * las animaciones quitados para seguir al sistema. Mismas hojas, mismas variables: lo que cambia
 * aquí cambia igual en las apps.
 */
type ThemeChoice = 'system' | 'light' | 'dark';

type DensityChoice = 'comfortable' | 'compact';

type MotionChoice = 'system' | 'full' | 'reduced';

export type Appearance = {
    density: DensityChoice;
    motion: MotionChoice;
    theme: ThemeChoice;
};

type AppearanceKey = keyof Appearance;

/** Lo que vale cada elección, la que manda sin nada guardado y si esa se escribe en la raíz. */
const CHOICES: { [K in AppearanceKey]: readonly Appearance[K][] } = {
    density: ['comfortable', 'compact'],
    motion: ['system', 'full', 'reduced'],
    theme: ['system', 'light', 'dark'],
};

const DEFAULTS: Appearance = { density: 'comfortable', motion: 'system', theme: 'system' };

/** La elección que se deja en manos del sistema no se escribe: el atributo se quita. */
const FOLLOWS_SYSTEM: Record<AppearanceKey, string | undefined> = {
    density: undefined,
    motion: 'system',
    theme: 'system',
};

const KEYS: readonly AppearanceKey[] = ['density', 'motion', 'theme'];

function storageKey(key: AppearanceKey): string {
    return `ui-lab.${key}`;
}

function readStored<K extends AppearanceKey>(key: K): Appearance[K] {
    try {
        const stored = localStorage.getItem(storageKey(key));

        return CHOICES[key].find((candidate) => candidate === stored) ?? DEFAULTS[key];
    } catch {
        return DEFAULTS[key];
    }
}

export function readStoredAppearance(): Appearance {
    return {
        density: readStored('density'),
        motion: readStored('motion'),
        theme: readStored('theme'),
    };
}

function apply(key: AppearanceKey, value: string): void {
    const root = document.documentElement;

    if (value === FOLLOWS_SYSTEM[key]) {
        root.removeAttribute(`data-${key}`);

        return;
    }

    root.dataset[key] = value;
}

export function applyStoredAppearance(): void {
    const appearance = readStoredAppearance();

    for (const key of KEYS) {
        apply(key, appearance[key]);
    }
}

export function storeAppearance<K extends AppearanceKey>(key: K, value: Appearance[K]): void {
    apply(key, value);

    try {
        localStorage.setItem(storageKey(key), value);
    } catch {
        // Sin almacenamiento, la elección vive solo en esta vista.
    }
}
