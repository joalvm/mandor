/** The characters `encodeURIComponent` spares that AWS still wants encoded. */
const SPARED = /[!'()*]/g;

/** The services whose path is signed encoded once: S3 alone, as the AWS SDKs say. */
const ENCODED_ONCE: ReadonlySet<string> = new Set(['s3']);

/** Text encoded as AWS signs it: every byte but `A-Z a-z 0-9 - _ . ~` as `%XX`, in upper case. */
export function awsEncode(text: string): string {
    return encodeURIComponent(text).replace(
        SPARED,
        (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
    );
}

/**
 * The path of the canonical request. Each segment is decoded from the url and encoded the AWS
 * way; every service but S3 encodes it once more, as the signature of those services asks.
 */
export function canonicalPath(pathname: string, service: string): string {
    if (pathname === '') {
        return '/';
    }

    const twice = !ENCODED_ONCE.has(service);

    return pathname
        .split('/')
        .map((segment) => {
            const once = awsEncode(decodeURIComponent(segment));

            return twice ? awsEncode(once) : once;
        })
        .join('/');
}

/** The query of the canonical request: every pair encoded, sorted by key and then by value. */
export function canonicalQuery(query: URLSearchParams): string {
    return [...query]
        .map(([key, value]) => [awsEncode(key), awsEncode(value)] as const)
        .sort(([keyA, valueA], [keyB, valueB]) =>
            keyA === keyB ? compare(valueA, valueB) : compare(keyA, keyB),
        )
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
}

/** By code point, as AWS sorts: never by the locale. */
function compare(a: string, b: string): number {
    if (a === b) {
        return 0;
    }

    return a < b ? -1 : 1;
}
