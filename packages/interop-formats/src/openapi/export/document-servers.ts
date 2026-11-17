import type { InteropServer } from '@mandor/interop-core';

/**
 * The servers the document offers: the address, the name the workspace gave as its description,
 * and the variables the url takes, each with the default it answers with. A server that takes
 * nothing names no variables at all — an empty map says less than no key.
 */
export function serversOfDocument(servers: readonly InteropServer[]): unknown[] {
    return servers.map((server) => ({
        url: server.url,
        description: server.name,
        ...(Object.keys(server.variables).length === 0
            ? {}
            : {
                  variables: Object.fromEntries(
                      Object.entries(server.variables).map(([name, variable]) => [
                          name,
                          {
                              default: variable.default,
                              ...(variable.enum === undefined ? {} : { enum: variable.enum }),
                              ...(variable.description === undefined
                                  ? {}
                                  : { description: variable.description }),
                          },
                      ]),
                  ),
              }),
    }));
}
