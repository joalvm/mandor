import type { Connection, Environment } from '@mandor/schema';
import { composeScope, computeDynamicValues, resolveTemplates } from '@mandor/vars';

/**
 * The url this connection dials, said in full: the template of the url with the enabled
 * params riding after whatever query the url already carries, every `{{var}}` resolved
 * against the environment the connection owns. This is a reading, never a field: the only
 * owners of what goes out are the url and the table.
 */
export function effectiveUrlOf(
    connection: Connection,
    environment: Environment | undefined,
): string {
    const templates: Record<string, string> = { url: connection.url };

    for (const [index, line] of (connection.params ?? []).entries()) {
        const at = String(index);

        templates[`param:${at}:key`] = line.key;
        templates[`param:${at}:value`] = line.value;
    }

    const resolved = resolveTemplates(
        templates,
        composeScope({ dynamic: computeDynamicValues(), environment: varsOf(environment) }),
    );

    return urlWithQuery(resolved.values['url'] ?? '', queryOf(connection, resolved.values));
}

/** The pairs the table says, resolved: on lines only, and only the ones with a name. */
function queryOf(connection: Connection, values: Record<string, string>): [string, string][] {
    const pairs: [string, string][] = [];

    for (const [index, line] of (connection.params ?? []).entries()) {
        if (!line.enabled || line.key === '') {
            continue;
        }

        const at = String(index);

        pairs.push([
            values[`param:${at}:key`] ?? line.key,
            values[`param:${at}:value`] ?? line.value,
        ]);
    }

    return pairs;
}

/** The enabled variables of the environment, by name. Secrets read as themselves on screen. */
function varsOf(environment: Environment | undefined): Record<string, string> {
    return Object.fromEntries(
        (environment?.variables ?? [])
            .filter((variable) => variable.enabled)
            .map((variable) => [variable.name, variable.value]),
    );
}

/** The query rides the way main appends it, so the bar never promises a different url. */
function urlWithQuery(base: string, query: readonly [string, string][]): string {
    if (query.length === 0) {
        return base;
    }

    try {
        const parsed = new URL(base);

        for (const [name, value] of query) {
            parsed.searchParams.append(name, value);
        }

        return parsed.toString();
    } catch {
        return base;
    }
}
