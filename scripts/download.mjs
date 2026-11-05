// Dependency-free bootstrap client: Node/OpenSSL, not Schannel/WinHTTP.
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
export async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function allowedURL(value) {
  const url = new URL(value);
  if (url.username || url.password) throw new Error('Credentials in URLs are not supported.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname)))
    throw new Error('Downloads require HTTPS; HTTP is allowed only for loopback tests.');
  return url;
}
async function responseFor(value, signal, redirects = 0) {
  const url = allowedURL(value), transport = url.protocol === 'https:' ? https : http;
  const agent = new transport.Agent({ proxyEnv: process.env });
  try {
    const response = await new Promise((resolve, reject) => {
      const request = transport.get(url, { agent, signal, headers: { 'User-Agent': 'Cevris-Plot-Installer' } }, resolve);
      request.on('error', reject);
    });
    if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
      response.resume(); agent.destroy();
      if (redirects >= 5 || !response.headers.location) throw new Error('Too many redirects or missing Location.');
      const next = allowedURL(new URL(response.headers.location, url));
      if (url.protocol === 'https:' && next.protocol !== 'https:') throw new Error('Refusing HTTPS downgrade.');
      return responseFor(next, signal, redirects + 1);
    }
    if (response.statusCode !== 200) {
      response.resume();
      const error = new Error(`HTTP ${response.statusCode} from ${url.origin}${url.pathname}`);
      error.status = response.statusCode; throw error;
    }
    return { response, agent };
  } catch (error) { agent.destroy(); throw error; }
}
export async function download(url, destination, { checksum, attempts = 3, timeoutMs = 180000, retryMs = 1200, log = console.error } = {}) {
  allowedURL(url);
  if (checksum && !/^[a-f0-9]{64}$/i.test(checksum)) throw new Error('Invalid SHA-256.');
  await fs.mkdir(path.dirname(path.resolve(destination)), { recursive: true });
  if (checksum && await sha256(destination).catch(() => '') === checksum.toLowerCase()) return { cached: true };
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const temporary = destination + '.' + randomUUID() + '.part';
    let agent;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const result = await responseFor(url, controller.signal); agent = result.agent;
      await pipeline(result.response, createWriteStream(temporary, { flags: 'wx' }), { signal: controller.signal });
      if (checksum && await sha256(temporary) !== checksum.toLowerCase()) throw new Error('SHA-256 mismatch.');
      await fs.rename(temporary, destination);
      return { cached: false };
    } catch (error) {
      lastError = error; log(`Download attempt ${attempt}/${attempts}: ${error.message}`);
      if ([400, 401, 403, 404].includes(error.status)) break;
    } finally { clearTimeout(timer); agent?.destroy(); await fs.rm(temporary, { force: true }); }
    if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, retryMs));
  }
  throw lastError;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [url, destination, checksum] = process.argv.slice(2);
  try {
    if (!url || !destination) throw new Error('Usage: node download.mjs HTTPS_URL OUTPUT [SHA256]');
    await download(url, destination, { checksum });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
