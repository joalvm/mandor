import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

function baseLanguageOf(language) {
    return language.split('-')[0];
}

function canonicalLanguageOf(language) {
    try {
        return Intl.getCanonicalLocales(language)[0];
    } catch {
        throw new Error(`${language} is not a valid BCP 47 language tag`);
    }
}

async function readLocale(root, entry) {
    const directory = join(root, entry.name);
    const files = (await readdir(directory, { withFileTypes: true }))
        .filter((file) => file.isFile() && file.name.endsWith('.json'))
        .map((file) => file.name)
        .sort();
    const namespaces = new Map();

    if (files.length === 0) {
        throw new Error(`${entry.name} has no JSON namespaces`);
    }

    for (const file of files) {
        const namespace = file.slice(0, -'.json'.length);
        const source = await readFile(join(directory, file), 'utf8');

        namespaces.set(namespace, JSON.parse(source));
    }

    return [entry.name, namespaces];
}

function validateLanguageNames(locales) {
    for (const language of locales.keys()) {
        if (canonicalLanguageOf(language) !== language) {
            throw new Error(`${language} is not a canonical BCP 47 language tag`);
        }
    }
}

function validateLocaleNamespaces(language, namespaces, expected) {
    const actual = [...namespaces.keys()].sort();
    const unknown = actual.find((namespace) => !expected.includes(namespace));

    if (!language.includes('-') && actual.join() !== expected.join()) {
        throw new Error(`${language} must contain namespaces: ${expected.join(', ')}`);
    }

    if (unknown !== undefined) {
        throw new Error(`${language}/${unknown}.json is not an English namespace`);
    }
}

function validateNamespaces(locales) {
    const english = locales.get('en');
    const expected = [...english.keys()].sort();

    for (const [language, namespaces] of locales) {
        const base = baseLanguageOf(language);

        if (!locales.has(base)) {
            throw new Error(`${language} has no complete ${base} base language`);
        }

        validateLocaleNamespaces(language, namespaces, expected);
    }

    return expected;
}

export async function readLocales(root) {
    const entries = (await readdir(root, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .sort((left, right) => left.name.localeCompare(right.name));
    const locales = new Map(await Promise.all(entries.map((entry) => readLocale(root, entry))));

    if (!locales.has('en')) {
        throw new Error('lang/en is required as the canonical contract');
    }

    validateLanguageNames(locales);
    const namespaces = validateNamespaces(locales);

    return { locales, namespaces };
}
