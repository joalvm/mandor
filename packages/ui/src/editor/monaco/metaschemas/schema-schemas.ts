import applicator from './2020-12/applicator.json';
import content from './2020-12/content.json';
import core from './2020-12/core.json';
import formatAnnotation from './2020-12/format-annotation.json';
import metaData from './2020-12/meta-data.json';
import unevaluated from './2020-12/unevaluated.json';
import validation from './2020-12/validation.json';
import draft07 from './draft-07.json';

/**
 * The metaschemas the service checks a schema document against, taken as data from
 * json-schema.org: the seven vocabularies of 2020-12, which its own meta-schema names one by
 * one, and the whole of draft-07, which is what an import of AsyncAPI brings — so a document is
 * checked by exactly what the standard publishes, without a request to the network.
 */

/** The file pattern of the schema documents of the app: the Uri `shared-models.ts` writes. */
const MANDOR_SCHEMA_PATTERN = 'inmemory://mandor/*';

/** The draft a document asks for by naming it in its `$schema`. */
const DRAFT_07 = 'http://json-schema.org/draft-07/schema';

/** What a document without a `$schema` falls to: the draft of OpenAPI 3.1 and of the checker. */
const DRAFT_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

/** What each dynamic word of a vocabulary says statically: its anchor nothing, its ref the root. */
const STATIC_WORDS = new Map<string, [string, unknown][]>([
    ['$dynamicAnchor meta', []],
    ['$dynamicRef #meta', [['$ref', DRAFT_2020_12]]],
]);

/** One member of a vocabulary, its dynamic word said statically and its value walked. */
function staticEntry(entry: [string, unknown]): [string, unknown][] {
    const [key, inner] = entry;
    const replaced = typeof inner === 'string' ? STATIC_WORDS.get(`${key} ${inner}`) : undefined;

    return replaced ?? [[key, withStaticRefs(inner)]];
}

/**
 * A vocabulary of 2020-12 with its `$dynamicRef` written as a `$ref`. The service follows no
 * dynamic reference, and warns on every document whose metaschema has one; inside the
 * meta-schema of 2020-12, which nothing here extends, `#meta` always lands on that meta-schema,
 * so a plain reference to it checks the same.
 */
function withStaticRefs(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(withStaticRefs);
    }

    if (typeof value !== 'object' || value === null) {
        return value;
    }

    return Object.fromEntries(Object.entries(value).flatMap(staticEntry));
}

/** The vocabularies of 2020-12, in the order its meta-schema names them. */
const DRAFT_2020_12_VOCABULARIES = [
    applicator,
    content,
    core,
    formatAnnotation,
    metaData,
    unevaluated,
    validation,
].map((vocabulary) => withStaticRefs(vocabulary) as { $id: string });

/** What the service is told about the schemas of the standard, and how they are found. */
export const SCHEMA_DOCUMENTS = [
    {
        schema: draft07,
        uri: DRAFT_07,
    },
    {
        fileMatch: [MANDOR_SCHEMA_PATTERN],
        schema: {
            $id: DRAFT_2020_12,
            allOf: DRAFT_2020_12_VOCABULARIES.map((vocabulary) => ({
                $ref: vocabulary.$id,
            })),
        },
        uri: DRAFT_2020_12,
    },
    ...DRAFT_2020_12_VOCABULARIES.map((vocabulary) => ({
        schema: vocabulary,
        uri: vocabulary.$id,
    })),
];
