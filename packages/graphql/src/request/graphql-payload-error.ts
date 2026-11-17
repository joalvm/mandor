/** Why a GraphQL body cannot be sent: broken variables, a subscription, or a syntax error. */
export class GraphqlPayloadError extends Error {
    readonly reason: 'variables' | 'subscription' | 'syntax';

    constructor(reason: GraphqlPayloadError['reason'], detail: string) {
        super(detail);
        this.name = 'GraphqlPayloadError';
        this.reason = reason;
    }
}
