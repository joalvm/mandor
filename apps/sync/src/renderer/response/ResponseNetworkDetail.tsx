import { useMessages } from '@mandor/i18n';
import { GlobeIcon } from '@mandor/icons';
import type { HttpResponse } from '@mandor/schema';

import { FactHeading } from './FactHeading.js';
import { FactRows } from './FactRows.js';
import { formatSocketEnd, httpVersionLabel } from './lib/format-response.js';
import { RedirectList } from './RedirectList.js';

type ResponseNetworkDetailProps = {
    response: HttpResponse;
};

type Row = readonly [string, string | undefined];

/**
 * The connection the answer came over: the protocol, both ends of the socket and, on `https`,
 * what the handshake settled. A line the send could not see is left out. The hops the send
 * followed before the answer close the panel.
 */
export function ResponseNetworkDetail({ response }: ResponseNetworkDetailProps) {
    const labels = useMessages('requests');
    const { network } = response;
    const tls = network?.tls;
    const rows: Row[] = [
        [labels('networkHttpVersion'), httpVersionLabel(response.httpVersion)],
        [
            labels('networkLocal'),
            network === undefined
                ? undefined
                : formatSocketEnd(network.localAddress, network.localPort),
        ],
        [
            labels('networkRemote'),
            network === undefined
                ? undefined
                : formatSocketEnd(network.remoteAddress, network.remotePort),
        ],
        [labels('networkTlsProtocol'), tls?.protocol],
        [labels('networkCipher'), tls?.cipher],
        [labels('networkCertificate'), tls?.subject],
        [labels('networkIssuer'), tls?.issuer],
        [labels('networkValidTo'), tls?.validTo],
    ];

    return (
        <div className="flex flex-col gap-gap-control" data-part="response-network-detail">
            <FactHeading label={labels('network')}>
                <GlobeIcon />
            </FactHeading>
            <FactRows rows={rows} />
            <Redirects redirects={response.redirects} />
        </div>
    );
}

function Redirects({ redirects }: { redirects: HttpResponse['redirects'] }) {
    if (redirects.length === 0) {
        return null;
    }

    return <RedirectList redirects={redirects} />;
}
