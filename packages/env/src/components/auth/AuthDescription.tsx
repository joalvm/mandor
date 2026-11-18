import { useMessages } from '@mandor/i18n';

import { AUTH_KINDS, type AuthKind } from '../../lib/auth-kinds.js';

type AuthDescriptionProps = {
    /** Who carries the auth that rules, said only while the level inherits. */
    inheritedLabel: string | undefined;
    kind: AuthKind;
};

/** What the chosen type does with the request, said once under the choice. */
export function AuthDescription({ inheritedLabel, kind }: AuthDescriptionProps) {
    return (
        <div className="flex min-w-0 flex-col gap-gap-tight" data-part="auth-description">
            <KindDescription kind={kind} />
            <InheritedOwner inheritedLabel={inheritedLabel} kind={kind} />
        </div>
    );
}

function KindDescription({ kind }: { kind: AuthKind }) {
    const messages = useMessages('auth');
    const entry = AUTH_KINDS.find((candidate) => candidate.kind === kind);

    if (entry === undefined) {
        return null;
    }

    return <p className="text-sm text-text-secondary">{messages(entry.description)}</p>;
}

function InheritedOwner({ inheritedLabel, kind }: AuthDescriptionProps) {
    if (kind !== 'inherit' || inheritedLabel === undefined) {
        return null;
    }

    return <p className="text-sm text-text-primary">{inheritedLabel}</p>;
}
