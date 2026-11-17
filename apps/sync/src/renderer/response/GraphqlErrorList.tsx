import { useMessages } from '@mandor/i18n';
import type { HttpResponse } from '@mandor/schema';

type GraphqlErrorListProps = {
    errors: NonNullable<HttpResponse['graphqlErrors']>;
};

/**
 * What the server said went wrong in an answer that was a 200. The list keeps the messages the
 * schema keeps; when the server sent more, it says how many were left out.
 */
export function GraphqlErrorList({ errors }: GraphqlErrorListProps) {
    const labels = useMessages('requests');
    const left = errors.count - errors.messages.length;
    // The server may repeat a message, so the position is the only identity a line has.

    return (
        <div
            className="flex max-h-24 min-w-0 shrink-0 flex-col gap-gap-tight overflow-auto bg-surface-error-tint px-pad-panel py-pad-control text-xs text-text-error"
            data-part="graphql-error-list"
        >
            <ul aria-label={labels('graphqlErrors')} className="flex flex-col gap-gap-tight">
                {errors.messages.map((message, index) => (
                    <li className="min-w-0 break-words" key={index}>
                        {message}
                    </li>
                ))}
            </ul>
            <ErrorsLeftOut left={left} />
        </div>
    );
}

function ErrorsLeftOut({ left }: { left: number }) {
    const labels = useMessages('requests');

    if (left <= 0) {
        return null;
    }

    return <span>{labels('graphqlErrorsMore', { count: left })}</span>;
}
