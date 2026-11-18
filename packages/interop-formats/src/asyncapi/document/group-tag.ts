// The tag that names a group of the traffic outright. A plain tag names it too, as long as
// nothing qualifies it — `source:handleLogin` and `direction:web` are qualifiers, not groups.
const DOMAIN_TAG = /^(?:domain|group|module):(.+)$/i;

/** The group a tag names outright, and nothing when it does not. */
export function domainOfTag(tag: string): string | undefined {
    return DOMAIN_TAG.exec(tag)?.[1];
}

/** The tag that names a group: its plain name, unless a colon would read it as a qualifier. */
export function groupTagOf(name: string): string {
    return name.includes(':') ? `group:${name}` : name;
}
