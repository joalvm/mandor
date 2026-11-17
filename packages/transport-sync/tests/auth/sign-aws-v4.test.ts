import { describe, expect, it } from 'vitest';

import { signAwsV4 } from '../../src/auth/sign-aws-v4.js';
import { headerOf, request } from '../support/cookie-fixtures.js';

const EMPTY_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

describe('signing a request with AWS Signature Version 4', () => {
    /** The example of the AWS documentation for IAM: same request, same key, same signature. */
    it('signs the documented IAM request with the documented signature', () => {
        const signed = signAwsV4(
            request('https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08', {
                headers: [['Content-Type', 'application/x-www-form-urlencoded; charset=utf-8']],
            }),
            {
                accessKeyId: 'AKIDEXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
                region: 'us-east-1',
                service: 'iam',
            },
            new Date('2015-08-30T12:36:00Z'),
        );

        expect(headerOf(signed, 'x-amz-date')).toBe('20150830T123600Z');
        expect(headerOf(signed, 'authorization')).toBe(
            'AWS4-HMAC-SHA256 Credential=AKIDEXAMPLE/20150830/us-east-1/iam/aws4_request, ' +
                'SignedHeaders=content-type;host;x-amz-date, ' +
                'Signature=5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7',
        );
    });

    /** The S3 example of the AWS documentation, with region and service read from the host. */
    it('signs the documented S3 request, its payload hash in a header of its own', () => {
        const signed = signAwsV4(
            request('https://examplebucket.s3.amazonaws.com/test.txt', {
                headers: [['Range', 'bytes=0-9']],
            }),
            {
                accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
                secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
            },
            new Date('2013-05-24T00:00:00Z'),
        );

        expect(headerOf(signed, 'x-amz-content-sha256')).toBe(EMPTY_HASH);
        expect(headerOf(signed, 'authorization')).toBe(
            'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, ' +
                'SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, ' +
                'Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41',
        );
    });

    it('signs the session token of temporary keys and sends it beside them', () => {
        const signed = signAwsV4(
            request('https://sqs.eu-west-1.amazonaws.com/'),
            { accessKeyId: 'AK', secretAccessKey: 'SK', sessionToken: 'session' },
            new Date('2026-10-15T08:00:00Z'),
        );

        expect(headerOf(signed, 'x-amz-security-token')).toBe('session');
        expect(headerOf(signed, 'authorization')).toContain(
            'Credential=AK/20261015/eu-west-1/sqs/aws4_request, ' +
                'SignedHeaders=host;x-amz-date;x-amz-security-token,',
        );
    });

    it('leaves out of the signature the headers a jar or a proxy may change on the way', () => {
        const signed = signAwsV4(
            request('https://iam.amazonaws.com/', {
                headers: [
                    ['User-Agent', 'mandor'],
                    ['Cookie', 'a=1'],
                    ['X-Custom', '  two   words '],
                ],
            }),
            { accessKeyId: 'AK', secretAccessKey: 'SK' },
            new Date('2026-10-15T08:00:00Z'),
        );

        expect(headerOf(signed, 'authorization')).toContain(
            'SignedHeaders=host;x-amz-date;x-custom,',
        );
    });

    it('signs the payload hash written by hand instead of hashing the body', () => {
        const body = new TextEncoder().encode('hello');
        const hashed = signAwsV4(
            request('https://bucket.s3.eu-west-1.amazonaws.com/a', { method: 'PUT', body }),
            { accessKeyId: 'AK', secretAccessKey: 'SK' },
            new Date('2026-10-15T08:00:00Z'),
        );
        const unsigned = signAwsV4(
            request('https://bucket.s3.eu-west-1.amazonaws.com/a', {
                method: 'PUT',
                body,
                headers: [['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD']],
            }),
            { accessKeyId: 'AK', secretAccessKey: 'SK' },
            new Date('2026-10-15T08:00:00Z'),
        );

        expect(headerOf(hashed, 'x-amz-content-sha256')).toBe(
            '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
        );
        expect(
            unsigned.headers.filter(([name]) => name.toLowerCase() === 'x-amz-content-sha256'),
        ).toEqual([['X-Amz-Content-Sha256', 'UNSIGNED-PAYLOAD']]);
    });
});
