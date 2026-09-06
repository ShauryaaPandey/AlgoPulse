import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('MongoDB connection resilience (unit)', () => {
  it('clientPromise is cleared on connection error so next call retries fresh', async () => {
    let callCount = 0;
    let cleared = false;

    let promise: Promise<string> | null = null;

    function getClient(): Promise<string> {
      if (!promise) {
        promise = createClient().catch(err => {
          promise = null;
          cleared = true;
          throw err;
        });
      }
      return promise;
    }

    async function createClient(): Promise<string> {
      callCount++;
      if (callCount === 1) throw new Error('SSL handshake failed');
      return 'connected';
    }

    await assert.rejects(getClient(), /SSL handshake/);
    assert.strictEqual(cleared, true, 'promise should be cleared after failure');
    assert.strictEqual(promise, null, 'promise should be null so next call retries');

    const result = await getClient();
    assert.strictEqual(result, 'connected');
    assert.strictEqual(callCount, 2, 'second call should create a new connection');
  });

  it('MongoTopologyClosedError from a stale client is caught before hitting Express', async () => {
    let unhandledRejection = false;
    const handler = () => { unhandledRejection = true; };
    process.on('unhandledRejection', handler);

    async function fakeVectorSearch(): Promise<string[]> {
      try {
        throw new Error('MongoTopologyClosedError: Topology is closed');
      } catch {
        return [];
      }
    }

    const results = await fakeVectorSearch();
    assert.deepStrictEqual(results, []);

    await new Promise(r => setTimeout(r, 10));
    assert.strictEqual(unhandledRejection, false, 'No unhandled rejections should escape');

    process.off('unhandledRejection', handler);
  });

  it('fire-and-forget indexing error does not produce unhandled rejection when caught', async () => {
    let unhandledRejection = false;
    const handler = () => { unhandledRejection = true; };
    process.on('unhandledRejection', handler);

    function triggerIndexing(): void {
      Promise.reject(new Error('MongoTopologyClosedError: Topology is closed'))
        .catch(() => {});
    }

    triggerIndexing();
    await new Promise(r => setTimeout(r, 20));

    assert.strictEqual(unhandledRejection, false, 'Caught fire-and-forget error should not be unhandled');
    process.off('unhandledRejection', handler);
  });
});
