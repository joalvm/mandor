/** The address Mandor receives the code on, as the document of another app writes it. */
export function loopbackRedirectOf(port: number | undefined): string | undefined {
    return port === undefined ? undefined : `http://127.0.0.1:${String(port)}/`;
}
