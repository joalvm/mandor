// The boundaries of the formats, apart from `.dependency-cruiser.cjs` so that file keeps its size.
// `never` is the helper that file builds its own rules with.

/**
 * What each format brings in and keeps to itself: the parser or the SDK of a format loads in its
 * own folder and in no other, so a format that cannot be listed without loading its library stays
 * a mistake of one folder. One boundary per row.
 */
const FORMAT_LIBRARIES = [
    ['openapi', '@readme/openapi-parser'],
    ['openapi', '@scalar/openapi-upgrader'],
    ['openapi', 'openapi-sampler'],
    ['asyncapi', '@asyncapi/parser'],
    ['bruno', '@usebruno/lang'],
    ['bruno', '@opencollection/types'],
];

/** @param {(name: string, comment: string, from: string, to: string | object) => object} never */
module.exports = (never) => [
    never(
        'formats-do-not-import-formats',
        'A format is its own folder: what two formats share goes up to interop-core, never sideways.',
        '^packages/interop-formats/src/([^/]+)/',
        '^packages/interop-formats/src/(?!$1/)[^/]+/',
    ),
    ...FORMAT_LIBRARIES.map(([format, library]) =>
        never(
            'a-format-library-stays-in-its-format',
            `${library} belongs to the ${format} folder of interop-formats and to no other file.`,
            `^(?!packages/interop-formats/(src|tests)/${format}/)`,
            `node_modules/${library}(/|$)`,
        ),
    ),
    never(
        'listing-a-format-loads-no-parser',
        'The descriptor of a format is read at startup: it reaches its codec and its libraries through import(), never statically.',
        '^packages/interop-formats/src/[^/]+/[^/]+-format\\.ts$',
        {
            path: '(-codec\\.ts$|node_modules/)',
            dynamic: false,
            dependencyTypesNot: ['type-only'],
        },
    ),
];
