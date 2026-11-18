/** The text main answers a send with when the request did not happen: the guest rejects with it. */
export function failedReply(message: string): string {
    return JSON.stringify({ ok: false, message });
}
