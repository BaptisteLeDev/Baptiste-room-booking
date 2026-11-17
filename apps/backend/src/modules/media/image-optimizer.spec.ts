import { describe, expect, it } from 'vitest';
import { ImageOptimizer } from './image-optimizer.js';

describe('ImageOptimizer', () => {
  it('keeps an already optimized media url as is', async () => {
    const url = '/api/media/' + 'a'.repeat(64) + '/1200.webp';
    await expect(new ImageOptimizer().optimizeFromUrl(url)).resolves.toBe(url);
  });

  it.each([
    'http://127.0.0.1/room.jpg',
    'http://169.254.169.254/latest/meta-data',
    'http://[::1]/room.jpg',
    'http://localhost/room.jpg',
    'http://[::ffff:127.0.0.1]/room.jpg',
    'http://[64:ff9b::7f00:1]/room.jpg',
    'http://[2002:7f00:1::1]/room.jpg',
    'http://[2001:0:4136:e378::1]/room.jpg',
    'http://192.0.0.1/room.jpg',
    'http://198.18.0.1/room.jpg',
    'http://240.0.0.1/room.jpg',
    'ftp://example.com/room.jpg',
  ])('rejects internal or non-http source %s before any fetch', async (src) => {
    await expect(new ImageOptimizer().optimizeFromUrl(src)).rejects.toThrow();
  });
});
