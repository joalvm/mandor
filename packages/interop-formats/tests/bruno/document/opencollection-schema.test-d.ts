import type { Auth } from '@opencollection/types/common/auth';
import type { Variable } from '@opencollection/types/common/variables';
import type { Environment } from '@opencollection/types/config/environments';
import type { Item } from '@opencollection/types/collection/item';
import type { GraphQLRequest } from '@opencollection/types/requests/graphql';
import type { HttpRequest } from '@opencollection/types/requests/http';
import type { WebSocketRequest } from '@opencollection/types/requests/websocket';
import type { OpenCollection } from '@opencollection/types';
import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import type {
    authSchema,
    collectionSchema,
    environmentSchema,
    graphqlSchema,
    httpSchema,
    itemSchema,
    variableSchema,
    websocketSchema,
} from '../../../src/bruno/document/opencollection-schema.js';

describe('what the import reads of OpenCollection', () => {
    it('takes every collection the types publish', () => {
        expectTypeOf<OpenCollection>().toExtend<z.input<typeof collectionSchema>>();
    });

    it('takes every item the types publish, a request, a folder or something else', () => {
        expectTypeOf<Item>().toExtend<z.input<typeof itemSchema>>();
    });

    it('takes the details of an HTTP request and of a GraphQL one', () => {
        expectTypeOf<NonNullable<HttpRequest['http']>>().toExtend<z.input<typeof httpSchema>>();
        expectTypeOf<NonNullable<GraphQLRequest['graphql']>>().toExtend<
            z.input<typeof graphqlSchema>
        >();
    });

    it('takes the details of a WebSocket request, with its message or its variants', () => {
        expectTypeOf<NonNullable<WebSocketRequest['websocket']>>().toExtend<
            z.input<typeof websocketSchema>
        >();
    });

    it('takes every way to authenticate the types publish', () => {
        expectTypeOf<Auth>().toExtend<z.input<typeof authSchema>>();
    });

    it('takes a variable and an environment', () => {
        expectTypeOf<Variable>().toExtend<z.input<typeof variableSchema>>();
        expectTypeOf<Environment>().toExtend<z.input<typeof environmentSchema>>();
    });
});
