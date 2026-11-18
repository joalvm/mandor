// The parser of the `.bru` language ships no types. Only what `read-bru.ts` calls is declared,
// and every call gives back `unknown`: a schema reads it before anything else does.
declare module '@usebruno/lang' {
    const lang: {
        bruToJsonV2: (text: string) => unknown;
        collectionBruToJson: (text: string) => unknown;
        bruToEnvJsonV2: (text: string) => unknown;
    };

    export = lang;
}
