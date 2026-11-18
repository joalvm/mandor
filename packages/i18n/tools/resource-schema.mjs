import Ajv2020 from 'ajv/dist/2020.js';

function objectSchema(value, complete) {
    const entries = Object.entries(value);
    const properties = Object.fromEntries(
        entries.map(([key, child]) => [key, schemaOf(child, complete)]),
    );
    const schema = { additionalProperties: false, properties, type: 'object' };

    if (complete) {
        schema.required = entries.map(([key]) => key);
    }

    return schema;
}

function schemaOf(value, complete) {
    if (typeof value === 'string') {
        return { minLength: 1, type: 'string' };
    }

    if (value === null || Array.isArray(value) || typeof value !== 'object') {
        throw new Error('Messages must be nested objects with string leaves');
    }

    return objectSchema(value, complete);
}

function validateLocaleResource(ajv, language, resource, validators) {
    if (resource === undefined) {
        return;
    }

    const validate = language.includes('-') ? validators.partial : validators.complete;

    if (!validate(resource)) {
        throw new Error(
            `${language}/${validators.namespace}.json violates message contract: ${ajv.errorsText(validate.errors)}`,
        );
    }
}

function validateNamespace(ajv, locales, english, namespace) {
    const validators = {
        complete: ajv.compile(schemaOf(english.get(namespace), true)),
        namespace,
        partial: ajv.compile(schemaOf(english.get(namespace), false)),
    };

    for (const [language, messages] of locales) {
        validateLocaleResource(ajv, language, messages.get(namespace), validators);
    }
}

export function validateResources(locales, namespaces) {
    const english = locales.get('en');
    const ajv = new Ajv2020({ allErrors: true });

    for (const namespace of namespaces) {
        validateNamespace(ajv, locales, english, namespace);
    }
}
