/**
 * The schemas inbound frames are judged against, keyed by the channel or event they answer.
 * The feature that owns the messages teaches this registry who has which schema; the timeline
 * reads it and nothing more. Without a provider, or without a schema for a channel, an inbound
 * frame is judged by nobody — silence, never an invented warning.
 */
export type InboundSchemas = {
    schemaForChannel: (channel: string) => Promise<string | undefined>;
};

let provider: InboundSchemas | undefined;

/** Hands the timeline the schemas to judge inbound frames by; the returned call takes them back. */
export function registerInboundSchemas(schemas: InboundSchemas): () => void {
    provider = schemas;

    return () => {
        provider = undefined;
    };
}

/** The schemas the timeline judges inbound frames by, or nobody's while none is registered. */
export function inboundSchemas(): InboundSchemas | undefined {
    return provider;
}
