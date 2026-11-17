import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { lookup as dnsLookup, type LookupAddress } from 'node:dns';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';
import { join, resolve } from 'node:path';
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { DomainError } from '../../common/domain-error.js';

const ROOM_IMAGE_WIDTHS = [400, 800, 1200] as const;
const MEDIA_PATH = '/api/media';

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 10_000;

// SSRF guard: user-supplied imageUrl must never reach internal hosts.
const PRIVATE = new BlockList();
for (const net of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  PRIVATE.addSubnet(net[0], net[1], 'ipv4');
// IPv6 is allowed only inside global unicast 2000::/3, minus ranges that embed IPv4 (6to4, Teredo) or are docs.
const GLOBAL_V6 = new BlockList();
GLOBAL_V6.addSubnet('2000::', 3, 'ipv6');
const NON_GLOBAL_V6 = new BlockList();
NON_GLOBAL_V6.addSubnet('2002::', 16, 'ipv6');
NON_GLOBAL_V6.addSubnet('2001::', 32, 'ipv6');
NON_GLOBAL_V6.addSubnet('2001:db8::', 32, 'ipv6');

const invalid = (message: string) =>
  new DomainError('invalid', 'INVALID_IMAGE', message);

export const mediaDir = () => resolve(process.env.MEDIA_DIR ?? 'media');

const publicBase = () => process.env.MEDIA_PUBLIC_URL ?? '';

@Injectable()
export class ImageOptimizer {
  // Returns the URL stored in room.imageUrl: largest variant, srcset built by the frontend.
  async optimizeFromUrl(source: string): Promise<string> {
    if (source.startsWith(`${publicBase()}${MEDIA_PATH}/`)) return source;
    const id = createHash('sha256').update(source).digest('hex');
    const target = join(mediaDir(), id);
    if (!(await exists(join(target, `${ROOM_IMAGE_WIDTHS.at(-1)}.webp`))))
      await this.build(source, target);
    return `${publicBase()}${MEDIA_PATH}/${id}/${ROOM_IMAGE_WIDTHS.at(-1)}.webp`;
  }

  private async build(source: string, target: string): Promise<void> {
    const bytes = await download(source);
    const tmp = `${target}.${randomUUID()}.tmp`;
    await mkdir(tmp, { recursive: true });
    try {
      const image = sharp(bytes, { limitInputPixels: 40_000_000 }).rotate();
      await Promise.all(
        ROOM_IMAGE_WIDTHS.map((width) =>
          image
            .clone()
            .resize({ width, withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(join(tmp, `${width}.webp`)),
        ),
      );
      await rename(tmp, target).catch(async (error) => {
        if (!(await exists(target))) throw error;
      });
    } catch {
      throw invalid('Image illisible.');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }
}

async function download(source: string): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(source);
  } catch {
    throw invalid('URL image invalide.');
  }
  const deadline = AbortSignal.timeout(TIMEOUT_MS);
  try {
    for (let hop = 0; ; hop++) {
      assertPublicUrl(url);
      const res = await get(url, deadline);
      const location = res.headers.location;
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        location
      ) {
        res.resume();
        if (hop >= MAX_REDIRECTS) throw invalid('Trop de redirections.');
        url = new URL(location, url);
        continue;
      }
      if (!res.statusCode || res.statusCode >= 300) {
        res.resume();
        throw invalid('Image introuvable.');
      }
      if (!res.headers['content-type']?.startsWith('image/')) {
        res.resume();
        throw invalid("Le fichier distant n'est pas une image.");
      }
      if (Number(res.headers['content-length'] ?? 0) > MAX_BYTES)
        throw invalid('Image trop lourde.');
      return await readBody(res);
    }
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw invalid('Image injoignable.');
  }
}

// Connection pinned to the address checked here: a second DNS answer cannot redirect the socket.
// Redirect hops go through this lookup too, so each hop is checked.
function get(url: URL, deadline: AbortSignal): Promise<IncomingMessage> {
  const send = url.protocol === 'https:' ? httpsRequest : httpRequest;
  return new Promise((resolve, reject) => {
    const req = send(url, { lookup: pinnedLookup }, resolve);
    deadline.addEventListener(
      'abort',
      () => req.destroy(new Error('timeout')),
      { once: true },
    );
    req.on('error', reject);
    req.end();
  });
}

type LookupCallback = (
  err: Error | null,
  address: string | LookupAddress[],
  family?: number,
) => void;

function pinnedLookup(
  hostname: string,
  options: { all?: boolean },
  callback: LookupCallback,
): void {
  dnsLookup(hostname, { all: true, verbatim: true }, (err, addresses) => {
    if (err) return callback(err, '');
    if (addresses.some(({ address, family }) => isBlocked(address, family)))
      return callback(invalid('Adresse interne interdite.'), '');
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

async function readBody(res: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of res as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BYTES) {
      res.destroy();
      throw invalid('Image trop lourde.');
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

const isBlocked = (address: string, family: number) =>
  family === 6
    ? !GLOBAL_V6.check(address, 'ipv6') || NON_GLOBAL_V6.check(address, 'ipv6')
    : PRIVATE.check(address, 'ipv4');

// Protocol and IP literals only: host names are checked by pinnedLookup at connect time.
function assertPublicUrl(url: URL): void {
  if (url.protocol !== 'https:' && url.protocol !== 'http:')
    throw invalid('Protocole non supporté.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const version = isIP(host);
  if (version && isBlocked(host, version))
    throw invalid('Adresse interne interdite.');
}

async function exists(path: string): Promise<boolean> {
  return access(path).then(
    () => true,
    () => false,
  );
}
