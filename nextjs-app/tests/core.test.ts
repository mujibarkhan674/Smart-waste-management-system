import { test } from 'node:test'
import assert from 'node:assert/strict'
import { haversineKm, nearestNeighbourOrder, estimateMinutes } from '../lib/routing'
import { statusForFillLevel, resolveBinStatus } from '../lib/bin-status'
import { sniffImageType } from '../lib/classifier'

test('haversine: known distance Kolkata (Esplanade) to Howrah Station ≈ 2.4 km', () => {
  const d = haversineKm({ latitude: 22.5646, longitude: 88.3516 }, { latitude: 22.5839, longitude: 88.3425 })
  assert.ok(d > 2.2 && d < 2.6, `got ${d}`)
})

test('haversine: zero for identical points and symmetric', () => {
  const a = { latitude: 22.5, longitude: 88.3 }
  const b = { latitude: 22.6, longitude: 88.4 }
  assert.equal(haversineKm(a, a), 0)
  assert.equal(haversineKm(a, b), haversineKm(b, a))
})

test('nearest neighbour visits points in greedy order from the depot', () => {
  const pts = [
    { id: 'far', latitude: 0, longitude: 3 },
    { id: 'near', latitude: 0, longitude: 1 },
    { id: 'mid', latitude: 0, longitude: 2 },
  ]
  const order = nearestNeighbourOrder(pts, { latitude: 0, longitude: 0 })
  assert.deepEqual(order.map((o) => o.item.id), ['near', 'mid', 'far'])
  assert.ok(order.every((o) => o.legDistanceKm > 0))
})

test('nearest neighbour without depot starts at the first item with a 0 km leg', () => {
  const order = nearestNeighbourOrder([{ id: 'a', latitude: 0, longitude: 0 }, { id: 'b', latitude: 0, longitude: 1 }])
  assert.equal(order[0].item.id, 'a')
  assert.equal(order[0].legDistanceKm, 0)
  assert.deepEqual(nearestNeighbourOrder([]), [])
})

test('time estimate = driving at 25 km/h + 5 min per stop (defaults)', () => {
  assert.equal(estimateMinutes(25, 4), 60 + 20)
  assert.equal(estimateMinutes(99, 2, 30), 30 + 10) // road duration overrides speed
})

test('bin status thresholds', () => {
  assert.equal(statusForFillLevel(0), 'active')
  assert.equal(statusForFillLevel(49), 'active')
  assert.equal(statusForFillLevel(50), 'monitoring')
  assert.equal(statusForFillLevel(69), 'monitoring')
  assert.equal(statusForFillLevel(70), 'almost_full')
  assert.equal(statusForFillLevel(89), 'almost_full')
  assert.equal(statusForFillLevel(90), 'needs_collection')
  assert.equal(statusForFillLevel(100), 'needs_collection')
  assert.equal(resolveBinStatus(95, true), 'maintenance')
})

test('image type sniffing uses magic bytes', () => {
  assert.equal(sniffImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg')
  assert.equal(sniffImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'image/png')
  assert.equal(sniffImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp')
  assert.equal(sniffImageType(Buffer.from('GIF89a')), null)
  assert.equal(sniffImageType(Buffer.from('hello')), null)
})
