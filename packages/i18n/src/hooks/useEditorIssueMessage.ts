import { useCallback } from 'react';

import { useMessages } from './useMessages.js';

/**
 * The replies of the JSON parser the editor margin translates. They are read in the margin of
 * the same editor as the marks of a schema, by whoever is writing the payload, so both are read
 * in the language the window is drawn in.
 *
 * XML is checked by a parser that writes its complaints with the tag inside them, so they are
 * not a closed set and stay in its own words: a sentence said half in each language is worse.
 */
const SYNTAX_KEYS = {
    'Closing brace expected': 'syntaxCloseBraceExpected',
    'Closing bracket expected': 'syntaxCloseBracketExpected',
    'Colon expected': 'syntaxColonExpected',
    'Comma expected': 'syntaxCommaExpected',
    'End of file expected': 'syntaxEndOfFileExpected',
    'Invalid characters in string. Control characters must be escaped.': 'syntaxInvalidCharacter',
    'Invalid comment token': 'syntaxInvalidCommentToken',
    'Invalid escape character in string': 'syntaxInvalidEscapeCharacter',
    'Invalid number format': 'syntaxInvalidNumberFormat',
    'Invalid symbol': 'syntaxInvalidSymbol',
    'Invalid unicode sequence in string': 'syntaxInvalidUnicode',
    'Property expected': 'syntaxPropertyNameExpected',
    'Syntax error': 'syntaxError',
    'Unexpected end of comment': 'syntaxUnexpectedEndOfComment',
    'Unexpected end of number': 'syntaxUnexpectedEndOfNumber',
    'Unexpected end of string': 'syntaxUnexpectedEndOfString',
    'Value expected': 'syntaxValueExpected',
} as const;

/** The rules of JSON Schema a value can break, each by the key of its words among the texts. */
const RULE_KEYS = {
    $ref: 'schemaRef',
    additionalItems: 'schemaAdditionalItems',
    additionalProperties: 'schemaAdditionalProperties',
    anyOf: 'schemaAnyOf',
    const: 'schemaConst',
    contains: 'schemaContains',
    dependencies: 'schemaDependentRequired',
    dependentRequired: 'schemaDependentRequired',
    enum: 'schemaEnum',
    exclusiveMaximum: 'schemaExclusiveMaximum',
    exclusiveMinimum: 'schemaExclusiveMinimum',
    false: 'schemaFalse',
    format: 'schemaFormat',
    items: 'schemaAdditionalItems',
    maxContains: 'schemaMaxContains',
    maxItems: 'schemaMaxItems',
    maxLength: 'schemaMaxLength',
    maxProperties: 'schemaMaxProperties',
    maximum: 'schemaMaximum',
    minContains: 'schemaMinContains',
    minItems: 'schemaMinItems',
    minLength: 'schemaMinLength',
    minProperties: 'schemaMinProperties',
    minimum: 'schemaMinimum',
    multipleOf: 'schemaMultipleOf',
    not: 'schemaNot',
    oneOf: 'schemaOneOf',
    pattern: 'schemaPattern',
    propertyNames: 'schemaPropertyNames',
    required: 'schemaRequired',
    type: 'schemaType',
    unevaluatedItems: 'schemaUnevaluatedItems',
    unevaluatedProperties: 'schemaUnevaluatedProperties',
    uniqueItems: 'schemaUniqueItems',
} as const;

/** The rule a mark of a schema speaks for, with what it asked and what it got. */
type SaidRule = { keyword: string; params: Readonly<Record<string, string>> };

type EditorKey =
    (typeof SYNTAX_KEYS)[keyof typeof SYNTAX_KEYS] | (typeof RULE_KEYS)[keyof typeof RULE_KEYS];

const KEY_OF_SYNTAX = new Map<string, EditorKey>(Object.entries(SYNTAX_KEYS));

const KEY_OF_RULE = new Map<string, EditorKey>(Object.entries(RULE_KEYS));

/**
 * Returns how the margin of an editor says one mark: in the language of the interface when the
 * reply is one it knows — a mark of a schema by its rule, a mark of the syntax by its words —
 * and as it came otherwise. The answer keeps its identity while the language does, so an editor
 * that compares its options by identity is not rebuilt.
 */
export function useEditorIssueMessage(): (message: string, rule?: SaidRule) => string {
    const words = useMessages('editor');

    return useCallback(
        (message: string, rule?: SaidRule) => {
            const key =
                rule === undefined ? KEY_OF_SYNTAX.get(message) : KEY_OF_RULE.get(rule.keyword);

            if (key === undefined) {
                return message;
            }

            // A key read from a table is a union, and the types cannot tie it to the params the
            // checker names for its rule: the call that carries a default takes them untyped.
            return words(key, { ...rule?.params, defaultValue: message });
        },
        [words],
    );
}
