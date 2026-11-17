import type { Connection } from '@mandor/schema';

import type { Empty, Result } from '../result/result.js';
import type { ConnectionCreateRequest } from './connection-create.js';
import type { ConnectionDeleteRequest } from './connection-delete.js';
import type { ConnectionListRequest } from './connection-list.js';
import type { ConnectionUpdateRequest } from './connection-update.js';

/** The connections of one workspace. Only Async serves it, so the core never names it. */
export type ConnectionArea = {
    create: (input: ConnectionCreateRequest) => Promise<Result<Connection>>;
    list: (input: ConnectionListRequest) => Promise<Result<Connection[]>>;
    update: (input: ConnectionUpdateRequest) => Promise<Result<Connection>>;
    delete: (input: ConnectionDeleteRequest) => Promise<Result<Empty>>;
};
