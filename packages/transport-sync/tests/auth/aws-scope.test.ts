import { describe, expect, it } from 'vitest';

import { awsScopeOf } from '../../src/auth/aws-scope.js';

describe('the region and service of an AWS host', () => {
    it('keeps the region and service the level wrote', () => {
        expect(awsScopeOf('api.example.com', 'eu-west-3', 'execute-api')).toEqual({
            region: 'eu-west-3',
            service: 'execute-api',
        });
    });

    it('reads the service before the region of a regional host', () => {
        expect(awsScopeOf('abc.execute-api.ap-southeast-2.amazonaws.com', '', '')).toEqual({
            region: 'ap-southeast-2',
            service: 'execute-api',
        });
    });

    it('takes us-east-1 for a global host, its service before the domain', () => {
        expect(awsScopeOf('bucket.s3.amazonaws.com', undefined, undefined)).toEqual({
            region: 'us-east-1',
            service: 's3',
        });
    });

    it('lets a host that is not AWS stand in for the service it cannot name', () => {
        expect(awsScopeOf('localhost', undefined, undefined)).toEqual({
            region: 'us-east-1',
            service: 'localhost',
        });
    });
});
