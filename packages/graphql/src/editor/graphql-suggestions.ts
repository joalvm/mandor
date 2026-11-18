import type { GraphQLSchema } from 'graphql';
import { getAutocompleteSuggestions, Position } from 'graphql-language-service';

import { positionOf } from './text-offsets.js';

type SuggestionKind =
    | 'argument'
    | 'directive'
    | 'enum'
    | 'field'
    | 'fragment'
    | 'keyword'
    | 'other'
    | 'type'
    | 'variable';

/** What the editor shows for one suggestion; the same shape `@mandor/ui` accepts, kept here by structure. */
export type GraphqlSuggestion = {
    detail?: string;
    documentation?: string;
    insertText: string;
    kind: SuggestionKind;
    label: string;
};

type RawItem = {
    detail?: string | null | undefined;
    documentation?: string | { value?: string } | null | undefined;
    insertText?: string | null | undefined;
    kind?: number | undefined;
    label: string;
};

/** The numbers of the language service's completion kinds, which is all it tells a field from a keyword by. */
const FIELD = 5;
const VARIABLE = 6;
const ENUM_VALUES = [13, 20];

function kindOf(item: RawItem, schema: GraphQLSchema): SuggestionKind {
    if (item.kind === FIELD) {
        return isTypeName(item, schema) ? 'type' : 'field';
    }

    if (item.kind !== undefined && ENUM_VALUES.includes(item.kind)) {
        return 'enum';
    }

    if (schema.getDirective(item.label) !== undefined) {
        return 'directive';
    }

    if (item.kind === VARIABLE) {
        return item.insertText?.endsWith(': ') === true ? 'argument' : 'type';
    }

    return 'keyword';
}

/** A field always says what it returns; a name with no such detail that the schema has a type for is that type. */
function isTypeName(item: RawItem, schema: GraphQLSchema): boolean {
    const bare = item.detail === null || item.detail === undefined;

    return bare && schema.getType(item.label) !== undefined;
}

function documentationOf(item: RawItem): string | undefined {
    const { documentation } = item;

    return typeof documentation === 'string' ? documentation : documentation?.value;
}

function suggestionOf(item: RawItem, schema: GraphQLSchema): GraphqlSuggestion {
    const documentation = documentationOf(item);

    return {
        ...(item.detail === null || item.detail === undefined ? {} : { detail: item.detail }),
        ...(documentation === undefined || documentation === '' ? {} : { documentation }),
        insertText: item.insertText ?? item.label,
        kind: kindOf(item, schema),
        label: item.label,
    };
}

/**
 * The suggestions of a query out of a schema, for the editor to show. The language service keeps
 * its own list of kinds and writes types and arguments with the same one, so what the editor
 * needs to tell them apart is read back out of the schema here.
 */
export function graphqlSuggestions(
    schema: GraphQLSchema,
): (text: string, offset: number) => readonly GraphqlSuggestion[] {
    return (text, offset) => {
        const { character, line } = positionOf(text, offset);

        return getAutocompleteSuggestions(schema, text, new Position(line, character)).map((item) =>
            suggestionOf(item, schema),
        );
    };
}
