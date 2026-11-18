/** Where and to whom a signature is addressed: the region and the service of the scope. */
export type AwsScope = { region: string; service: string };

/** The region a global endpoint, such as IAM's or S3's without one, signs for. */
const GLOBAL_REGION = 'us-east-1';

/** A region as AWS names them: `us-east-1`, `ap-southeast-2`, `us-gov-west-1`. */
const REGION = /^[a-z]{2}(-[a-z]+)+-\d+$/;

/**
 * The region and service of a signature. What the level wrote wins; what it left empty is read
 * from the host, as AWS names its endpoints: `<service>.<region>.amazonaws.com`, or
 * `<service>.amazonaws.com` for a global one. A host that is not AWS's names no service: the
 * host itself stands in, and the level has to write the right one.
 */
export function awsScopeOf(
    host: string,
    region: string | undefined,
    service: string | undefined,
): AwsScope {
    const labels = host.split('.');
    const at = labels.findIndex((label) => REGION.test(label));
    const domainAt = labels.indexOf('amazonaws');
    const serviceAt = at === -1 ? domainAt - 1 : at - 1;

    return {
        region: written(region) ?? labels[at] ?? GLOBAL_REGION,
        service: written(service) ?? labels[serviceAt] ?? host,
    };
}

function written(text: string | undefined): string | undefined {
    return text === undefined || text === '' ? undefined : text;
}
