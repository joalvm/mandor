import Ajv2020 from 'ajv/dist/2020.js';

/** The forms a count can take in any language, as `Intl.PluralRules` names them. */
const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many', 'other'];
const PLURAL_KEY = new RegExp(`^(.+)_(${PLURAL_CATEGORIES.join('|')})$`);

/** Up to here every form a whole count takes in a language shows up at least once. */
const COUNTS_SAMPLED = 1000;

/**
 * What a language says of its counts: every form its rules have, and the ones a whole count of
 * things actually lands in. Spanish has `many` only for round millions, Russian lands in `many`
 * at five: a form no small count reaches may be left out, and i18next reads `_other` for it.
 */
export function pluralFormsOf(language) {
    const rules = new Intl.PluralRules(language);
    const reached = new Set(['other']);

    for (let count = 0; count <= COUNTS_SAMPLED; count += 1) {
        reached.add(rules.select(count));
    }

    return {
        allowed: rules.resolvedOptions().pluralCategories,
        required: PLURAL_CATEGORIES.filter((category) => reached.has(category)),
    };
}

/** The keys English says in plural, by the key a call site names: `tabs` for `tabs_other`. */
function pluralBasesOf(value) {
    return new Set(
        Object.keys(value)
            .map((key) => PLURAL_KEY.exec(key))
            .filter((match) => match !== null && match[2] === 'other')
            .map((match) => match[1]),
    );
}

function isPluralKey(key, bases) {
    const match = PLURAL_KEY.exec(key);

    return match !== null && bases.has(match[1]);
}

function pluralProperties(bases, forms, complete) {
    const properties = {};
    const required = [];

    for (const base of bases) {
        for (const category of forms.allowed) {
            properties[`${base}_${category}`] = { minLength: 1, type: 'string' };
        }

        if (complete) {
            required.push(...forms.required.map((category) => `${base}_${category}`));
        }
    }

    return { properties, required };
}

function objectSchema(value, complete, forms) {
    const bases = pluralBasesOf(value);
    const entries = Object.entries(value).filter(([key]) => !isPluralKey(key, bases));
    const plurals = pluralProperties(bases, forms, complete);
    const properties = {
        ...Object.fromEntries(
            entries.map(([key, child]) => [key, schemaOf(child, complete, forms)]),
        ),
        ...plurals.properties,
    };
    const schema = { additionalProperties: false, properties, type: 'object' };

    if (complete) {
        schema.required = [...entries.map(([key]) => key), ...plurals.required];
    }

    return schema;
}

/**
 * The shape a language must give one English namespace: the same keys, except that a key English
 * says in plural takes the forms of that language instead of the two of English.
 */
export function schemaOf(value, complete, forms) {
    if (typeof value === 'string') {
        return { minLength: 1, type: 'string' };
    }

    if (value === null || Array.isArray(value) || typeof value !== 'object') {
        throw new Error('Messages must be nested objects with string leaves');
    }

    return objectSchema(value, complete, forms);
}

function validateLocale(ajv, english, language, namespaces) {
    const forms = pluralFormsOf(language);
    const complete = !language.includes('-');

    for (const [namespace, resource] of namespaces) {
        const validate = ajv.compile(schemaOf(english.get(namespace), complete, forms));

        if (!validate(resource)) {
            throw new Error(
                `${language}/${namespace}.json violates message contract: ${ajv.errorsText(validate.errors)}`,
            );
        }
    }
}

/**
 * Every language says every English message, and a regional variant only the ones it changes. A
 * missing form of a plural falls back to `_other` of the same language, so only the forms a small
 * count reaches are demanded.
 */
export function validateResources(locales) {
    const english = locales.get('en');
    const ajv = new Ajv2020({ allErrors: true });

    for (const [language, namespaces] of locales) {
        validateLocale(ajv, english, language, namespaces);
    }
}
