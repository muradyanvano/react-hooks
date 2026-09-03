import { describe, expect, it } from 'vitest'

import {
  arrayBuffersEqual,
  blobsHaveEqualBytes,
  createEndpointSignature,
  createHeartbeatSignature,
  isBlobHeartbeatCandidate,
  isHeartbeatResponse,
  normalizeAutoReconnect,
  normalizeHeartbeat,
  normalizeNonNegativeMs,
  normalizeProtocolsSnapshot,
  normalizeUrlSnapshot,
  resolveReconnectDelay,
  shouldAttemptReconnect,
} from './webSocketHelpers'

describe('webSocketHelpers', () => {
  it('normalizes timing values', () => {
    expect(normalizeNonNegativeMs(250, 1000)).toBe(250)
    expect(normalizeNonNegativeMs(-1, 1000)).toBe(1000)
    expect(normalizeNonNegativeMs(Number.NaN, 1000)).toBe(1000)
    expect(normalizeNonNegativeMs(Number.POSITIVE_INFINITY, 1000)).toBe(1000)
    expect(normalizeNonNegativeMs('nope', 1000)).toBe(1000)
  })

  it('normalizes URL snapshots', () => {
    expect(normalizeUrlSnapshot(null)).toBeNull()
    expect(normalizeUrlSnapshot(undefined)).toBeNull()
    expect(normalizeUrlSnapshot('')).toBeNull()
    expect(normalizeUrlSnapshot('   ')).toBeNull()
    expect(normalizeUrlSnapshot(' wss://a.test ')).toBe('wss://a.test')
    expect(normalizeUrlSnapshot(new URL('wss://a.test/path'))).toBe(
      'wss://a.test/path',
    )
  })

  it('normalizes protocols and endpoint signatures', () => {
    expect(normalizeProtocolsSnapshot(undefined)).toBeNull()
    expect(normalizeProtocolsSnapshot('chat')).toBe('chat')
    expect(normalizeProtocolsSnapshot(['a', 'b'])).toBe('["a","b"]')
    expect(createEndpointSignature('wss://a.test', 'chat')).toBe(
      'wss://a.test::chat',
    )
    expect(createEndpointSignature(null, 'chat')).toBeNull()
    expect(createEndpointSignature('wss://a.test', ['a', 'b'])).toBe(
      'wss://a.test::["a","b"]',
    )
  })

  it('normalizes reconnect defaults', () => {
    expect(normalizeAutoReconnect(false).enabled).toBe(false)
    expect(normalizeAutoReconnect(true)).toMatchObject({
      enabled: true,
      retries: -1,
      delay: 1000,
    })
    expect(normalizeAutoReconnect({ retries: 3, delay: 200 }).retries).toBe(3)
  })

  it('normalizes heartbeat defaults', () => {
    expect(normalizeHeartbeat(false).enabled).toBe(false)
    expect(normalizeHeartbeat(true)).toMatchObject({
      enabled: true,
      message: 'ping',
      responseMessage: 'ping',
      interval: 1000,
      pongTimeout: 1000,
    })
    expect(
      normalizeHeartbeat({
        message: 'ping',
        responseMessage: 'pong',
        interval: -5,
        pongTimeout: Number.NaN,
      }),
    ).toMatchObject({
      message: 'ping',
      responseMessage: 'pong',
      interval: 1000,
      pongTimeout: 1000,
    })
  })

  it('creates stable heartbeat signatures', () => {
    expect(createHeartbeatSignature(false)).toBe('off')
    expect(createHeartbeatSignature(true)).toBe(
      createHeartbeatSignature({
        message: 'ping',
        responseMessage: 'ping',
        interval: 1000,
        pongTimeout: 1000,
      }),
    )
  })

  it('resolves reconnect delays and retry decisions', () => {
    expect(resolveReconnectDelay(500, 1)).toBe(500)
    expect(resolveReconnectDelay((attempt) => attempt * 100, 3)).toBe(300)
    expect(resolveReconnectDelay(-10, 1)).toBe(1000)

    const close = { code: 1006 } as CloseEvent
    expect(shouldAttemptReconnect(-1, 99, close)).toBe(true)
    expect(shouldAttemptReconnect(3, 3, close)).toBe(true)
    expect(shouldAttemptReconnect(3, 4, close)).toBe(false)
    expect(
      shouldAttemptReconnect(
        (_attempt, event) => event.code === 1006,
        1,
        close,
      ),
    ).toBe(true)
    expect(
      shouldAttemptReconnect(
        () => {
          throw new Error('boom')
        },
        1,
        close,
      ),
    ).toBe(false)
  })

  it('matches string and ArrayBuffer heartbeat responses synchronously', () => {
    expect(isHeartbeatResponse('pong', 'pong')).toBe(true)
    expect(isHeartbeatResponse('ping', 'pong')).toBe(false)
    expect(isHeartbeatResponse('Ping', 'ping')).toBe(false)
    expect(isHeartbeatResponse('ping ', 'ping')).toBe(false)

    const left = new Uint8Array([1, 2, 3]).buffer
    const right = new Uint8Array([1, 2, 3]).buffer
    const other = new Uint8Array([1, 2, 4]).buffer
    expect(arrayBuffersEqual(left, right)).toBe(true)
    expect(isHeartbeatResponse(left, right)).toBe(true)
    expect(isHeartbeatResponse(other, right)).toBe(false)

    const blob = new Blob(['x'], { type: 'text/plain' })
    // Blob matching is async-only; sync helper never claims a Blob match.
    expect(isHeartbeatResponse(blob, blob)).toBe(false)
  })

  it('gates and compares Blob heartbeat payloads by byte contents', async () => {
    const expected = new Blob(['ping'], { type: 'text/plain' })
    const equal = new Blob(['ping'], { type: 'text/plain' })
    const differentBytes = new Blob(['pong'], { type: 'text/plain' })
    const differentType = new Blob(['ping'], {
      type: 'application/octet-stream',
    })
    const emptyA = new Blob([], { type: 'text/plain' })
    const emptyB = new Blob([], { type: 'text/plain' })

    expect(isBlobHeartbeatCandidate(equal, expected)).toBe(true)
    expect(isBlobHeartbeatCandidate(differentBytes, expected)).toBe(true)
    expect(isBlobHeartbeatCandidate(differentType, expected)).toBe(false)
    expect(isBlobHeartbeatCandidate('ping', expected)).toBe(false)

    await expect(blobsHaveEqualBytes(equal, expected)).resolves.toBe(true)
    await expect(blobsHaveEqualBytes(differentBytes, expected)).resolves.toBe(
      false,
    )
    await expect(blobsHaveEqualBytes(differentType, expected)).resolves.toBe(
      false,
    )
    await expect(blobsHaveEqualBytes(emptyA, emptyB)).resolves.toBe(true)

    const rejecting = new Blob(['ping'], { type: 'text/plain' })
    Object.defineProperty(rejecting, 'arrayBuffer', {
      configurable: true,
      value: () => Promise.reject(new Error('read failed')),
    })
    await expect(blobsHaveEqualBytes(rejecting, expected)).resolves.toBe(false)
  })
})
