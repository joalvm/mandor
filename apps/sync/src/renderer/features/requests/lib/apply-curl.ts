import type { CurlRequest, RequestItem, RequestSettingsOverrides } from '@mandor/schema';

/** Each setting the command names replaces the one the request had; the rest stays. */
function settingsOf(
    current: RequestSettingsOverrides,
    named: CurlRequest['settings'],
): RequestSettingsOverrides {
    const said = Object.entries(named).filter(([, value]) => value !== undefined);

    return { ...current, ...Object.fromEntries(said) };
}

/**
 * What a pasted curl does to a request: the command says what goes out, so the method, the url,
 * the lines and the body are its own, and the path values and the schema of the body that were
 * there describe something else now. What the command does not say stays: the settings it does
 * not name, the auth it does not carry, and everything that is about the request and not about
 * the send (name, description, examples, the scripts the person wrote and the ones an import brought).
 */
export function applyCurl(current: RequestItem, parsed: CurlRequest): RequestItem {
    return {
        name: current.name,
        method: parsed.method,
        url: parsed.url,
        query: parsed.query,
        headers: parsed.headers,
        pathParams: [],
        body: parsed.body,
        examples: current.examples,
        settings: settingsOf(current.settings, parsed.settings),
        description: current.description,
        auth: parsed.auth ?? current.auth,
        importedScripts: current.importedScripts,
        scripts: current.scripts,
    };
}
