import { describe, expect, it, vi } from 'vitest'

import {
  canGetUserMedia,
  collectStreamTracks,
  constraintsSignaturesEqual,
  createConstraintsSignature,
  createDefaultUserMediaConstraints,
  getMediaDevicesForUserMedia,
  isTrackLive,
  isUserMediaSupported,
  normalizeUserMediaError,
  stopMediaStreamTracks,
  streamHasLiveTrack,
} from './userMediaHelpers'

describe('userMediaHelpers', () => {
  describe('normalizeUserMediaError', () => {
    it('preserves Error and DOMException-like objects', () => {
      const error = new Error('denied')
      error.name = 'NotAllowedError'
      expect(normalizeUserMediaError(error)).toBe(error)

      const domLike = {
        message: 'blocked',
        name: 'SecurityError',
      }
      const normalized = normalizeUserMediaError(domLike)
      expect(normalized.message).toBe('blocked')
      expect(normalized.name).toBe('SecurityError')
    })

    it('normalizes strings and unknown values', () => {
      expect(normalizeUserMediaError('oops').message).toBe('oops')
      expect(normalizeUserMediaError(null).message).toBe('null')
      expect(normalizeUserMediaError({ a: 1 }).message).toContain('a')
    })
  })

  describe('support detection', () => {
    it('detects callable getUserMedia', () => {
      vi.stubGlobal('navigator', {
        mediaDevices: {
          getUserMedia: vi.fn(),
        },
      })
      expect(isUserMediaSupported()).toBe(true)
      expect(canGetUserMedia(getMediaDevicesForUserMedia())).toBe(true)
      vi.unstubAllGlobals()
    })

    it('returns false for missing navigator/mediaDevices/non-callable', () => {
      vi.stubGlobal('navigator', undefined)
      expect(isUserMediaSupported()).toBe(false)

      vi.stubGlobal('navigator', {})
      expect(isUserMediaSupported()).toBe(false)

      vi.stubGlobal('navigator', {
        mediaDevices: { getUserMedia: 'nope' },
      })
      expect(isUserMediaSupported()).toBe(false)
      vi.unstubAllGlobals()
    })
  })

  describe('defaults', () => {
    it('creates fresh video-only defaults', () => {
      const a = createDefaultUserMediaConstraints()
      const b = createDefaultUserMediaConstraints()
      expect(a).toEqual({ video: true, audio: false })
      expect(a).not.toBe(b)
    })
  })

  describe('tracks', () => {
    it('detects live tracks and collects them', () => {
      const live = {
        readyState: 'live',
        stop: vi.fn(),
      } as unknown as MediaStreamTrack
      const ended = {
        readyState: 'ended',
        stop: vi.fn(),
      } as unknown as MediaStreamTrack
      const stream = {
        getTracks: () => [live, ended],
      } as unknown as MediaStream

      expect(isTrackLive(live)).toBe(true)
      expect(isTrackLive(ended)).toBe(false)
      expect(streamHasLiveTrack(stream)).toBe(true)
      expect(collectStreamTracks(stream)).toEqual([live, ended])
    })

    it('stops all tracks even when one throws', () => {
      const a = {
        stop: vi.fn(() => {
          throw new Error('stop failed')
        }),
      }
      const b = { stop: vi.fn() }
      const stream = {
        getTracks: () => [a, b],
      } as unknown as MediaStream

      expect(() => stopMediaStreamTracks(stream)).not.toThrow()
      expect(a.stop).toHaveBeenCalledOnce()
      expect(b.stop).toHaveBeenCalledOnce()
    })
  })

  describe('createConstraintsSignature', () => {
    it('ignores object key order', () => {
      expect(createConstraintsSignature({ video: true, audio: false })).toBe(
        createConstraintsSignature({ audio: false, video: true }),
      )
    })

    it('treats array order as meaningful', () => {
      expect(
        createConstraintsSignature({
          video: { advanced: [{ width: 1 }, { width: 2 }] },
        }),
      ).not.toBe(
        createConstraintsSignature({
          video: { advanced: [{ width: 2 }, { width: 1 }] },
        }),
      )
    })

    it('detects nested exact/ideal/min/max changes', () => {
      const left = { video: { width: { ideal: 1280, min: 640 } } }
      const right = { video: { width: { ideal: 1920, min: 640 } } }
      expect(constraintsSignaturesEqual(left, right)).toBe(false)
      expect(
        constraintsSignaturesEqual(left, {
          video: { width: { min: 640, ideal: 1280 } },
        }),
      ).toBe(true)
    })

    it('handles cyclic objects without throwing', () => {
      const cyclic: Record<string, unknown> = { video: true }
      cyclic.self = cyclic
      expect(() => createConstraintsSignature(cyclic)).not.toThrow()
      expect(createConstraintsSignature(cyclic)).toContain('cycle:')
    })
  })
})
