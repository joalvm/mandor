import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { format } from 'prettier';

import { readLocales } from './locale-files.mjs';
import { validateResources } from './resource-schema.mjs';

const PACKAGE_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LANGUAGE_ROOT = join(PACKAGE_ROOT, 'src', 'lang');
const GENERATED_ROOT = join(PACKAGE_ROOT, 'src', 'generated');

function identifierOf(language) {
    return `${language.replaceAll('-', '_').toUpperCase()}_RESOURCE`;
}

function importIdentifier(language, namespace) {
    const parts = `${language}-${namespace}`.split('-');

    return parts
        .map((part, index) => {
            if (index === 0) {
                return part;
            }

            return `${part[0].toUpperCase()}${part.slice(1)}`;
        })
        .join('');
}

function importsSource(locales) {
    const imports = [];

    for (const [language, namespaces] of locales) {
        for (const namespace of namespaces.keys()) {
            const identifier = importIdentifier(language, namespace);

            imports.push(`import ${identifier} from '../lang/${language}/${namespace}.json';`);
        }
    }

    return imports.join('\n');
}

function resourceSource(language, namespaces) {
    const entries = [...namespaces.keys()]
        .map((namespace) => `    ${namespace}: ${importIdentifier(language, namespace)},`)
        .join('\n');
    const identifier = identifierOf(language);

    if (language === 'en') {
        return `export const EN_RESOURCE = {\n${entries}\n};`;
    }

    if (!language.includes('-')) {
        return `const ${identifier} = {\n${entries}\n} satisfies LocaleMessages<typeof EN_RESOURCE>;`;
    }

    return `const ${identifier} = {\n${entries}\n} satisfies DeepPartial<typeof EN_RESOURCE>;`;
}

/**
 * What the compiler holds a translation to: every key of English but its plural forms, which
 * follow the rules of each language and are checked by `validateResources` instead.
 */
const LOCALE_MESSAGES_TYPE = [
    "type PluralCategory = 'few' | 'many' | 'one' | 'other' | 'two' | 'zero';",
    '',
    "/** Every English key; the plural forms are each language's own, checked when generating. */",
    'type LocaleMessages<Value> = Value extends string',
    '    ? string',
    '    : {',
    '          [Key in keyof Value as Key extends `${string}_${PluralCategory}`',
    '              ? never',
    '              : Key]: LocaleMessages<Value[Key]>;',
    '      };',
    '',
    '',
].join('\n');

function registrySource(locales, namespaces) {
    const languages = [...locales.keys()];
    const hasVariants = languages.some((language) => language.includes('-'));
    const hasTranslations = languages.some(
        (language) => language !== 'en' && !language.includes('-'),
    );
    const localeType = hasTranslations ? LOCALE_MESSAGES_TYPE : '';
    const resources = languages
        .map((language) => `    '${language}': ${identifierOf(language)},`)
        .join('\n');
    const languageValues = languages.map((language) => `'${language}'`).join(', ');
    const namespaceValues = namespaces.map((namespace) => `'${namespace}'`).join(', ');
    const resourceDeclarations = [...locales]
        .map(([language, messages]) => resourceSource(language, messages))
        .join('\n\n');
    const partialType = hasVariants
        ? `type DeepPartial<Value> = Value extends string\n    ? Value\n    : { [Key in keyof Value]?: DeepPartial<Value[Key]> };\n\n`
        : '';

    return `import type { ErrorCode } from '@mandor/ipc';\n\n${importsSource(locales)}\n\n${partialType}${localeType}const EN_ERRORS = enErrors satisfies Record<ErrorCode, string>;\n\n${resourceDeclarations.replace('errors: enErrors', 'errors: EN_ERRORS')}\n\nexport const DEFAULT_LANGUAGE = 'en';\nexport const DEFAULT_NAMESPACE = 'shell';\nexport const LANGUAGE_CODES = [${languageValues}] as const;\nexport const NAMESPACES = [${namespaceValues}] as const;\nexport const RESOURCES = {\n${resources}\n};\n\nexport type Language = (typeof LANGUAGE_CODES)[number];\nexport type MessageNamespace = (typeof NAMESPACES)[number];\n`;
}

async function syncFile(path, source, check) {
    const expected = await format(source, {
        endOfLine: 'lf',
        parser: 'typescript',
        printWidth: 100,
        singleQuote: true,
        tabWidth: 4,
        trailingComma: 'all',
    });

    if (!check) {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, expected, 'utf8');

        return;
    }

    const current = await readFile(path, 'utf8').catch(() => '');

    if (current !== expected) {
        throw new Error(`${path} is stale; run npm run i18n`);
    }
}

const { locales, namespaces } = await readLocales(LANGUAGE_ROOT);
const check = process.argv.includes('--check');

validateResources(locales);
await syncFile(join(GENERATED_ROOT, 'resources.ts'), registrySource(locales, namespaces), check);
