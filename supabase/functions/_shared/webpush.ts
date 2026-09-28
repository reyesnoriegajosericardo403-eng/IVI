// Web Push (RFC 8291 "aes128gcm" + VAPID RFC 8292) implementado solo con
// WebCrypto — sin la librería `web-push` de npm, que depende de módulos
// de Node (`https`, `crypto.createECDH`) que no siempre funcionan igual en
// el runtime de Edge Functions de Supabase. Esto corre idéntico en Deno y
// en Node 20+ (así se probó: ver scripts/test-webpush.mjs).

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string; // base64url, llave pública P-256 sin comprimir (65 bytes)
  auth: string; // base64url, secreto de autenticación (16 bytes)
}

export interface VapidKeys {
  publicKey: string; // base64url, 65 bytes (0x04 || x || y)
  privateKey: string; // base64url, 32 bytes (d)
  subject: string; // "mailto:..." o una URL https
}

export interface PushSendResult {
  ok: boolean;
  status: number;
  // 404/410: el navegador ya dio de baja esta suscripción — hay que borrarla.
  gone: boolean;
  body?: string;
}

const enc = new TextEncoder();

export function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey('raw', key as BufferSource, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, data as BufferSource));
}

// HKDF de una sola ronda (el largo pedido nunca pasa de 32 bytes aquí).
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmacSha256(salt, ikm);
  const okm = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

export async function encryptPayload(
  sub: PushSubscriptionKeys,
  plaintext: Uint8Array,
  opts: { salt?: Uint8Array; asKeyPair?: CryptoKeyPair } = {}
): Promise<Uint8Array> {
  const uaPublic = base64UrlToBytes(sub.p256dh);
  const authSecret = base64UrlToBytes(sub.auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('Suscripción con llaves inválidas');

  const asKeyPair =
    opts.asKeyPair ??
    ((await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic as BufferSource, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeyPair.privateKey, 256));

  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // Un solo registro: contenido + delimitador 0x02 (último registro), sin relleno.
  const record = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek as BufferSource, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce as BufferSource }, aesKey, record as BufferSource));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}

async function importVapidPrivateKey(vapid: VapidKeys): Promise<CryptoKey> {
  const pub = base64UrlToBytes(vapid.publicKey);
  if (pub.length !== 65) throw new Error('VAPID_PUBLIC_KEY inválida');
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: vapid.privateKey,
    x: bytesToBase64Url(pub.slice(1, 33)),
    y: bytesToBase64Url(pub.slice(33, 65)),
    ext: true,
  };
  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

export async function vapidAuthorization(endpoint: string, vapid: VapidKeys, nowSeconds = Math.floor(Date.now() / 1000)): Promise<string> {
  const header = bytesToBase64Url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToBase64Url(
    enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: nowSeconds + 12 * 3600, sub: vapid.subject }))
  );
  const unsigned = `${header}.${claims}`;
  const key = await importVapidPrivateKey(vapid);
  // WebCrypto ya entrega la firma en formato r||s (P1363), que es justo el que pide JWT ES256.
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${bytesToBase64Url(signature)}, k=${vapid.publicKey}`;
}

export async function sendWebPush(
  sub: PushSubscriptionKeys,
  payload: unknown,
  vapid: VapidKeys,
  opts: { ttlSeconds?: number; urgency?: 'very-low' | 'low' | 'normal' | 'high'; topic?: string } = {}
): Promise<PushSendResult> {
  const body = await encryptPayload(sub, enc.encode(JSON.stringify(payload)));
  const headers: Record<string, string> = {
    'Content-Type': 'application/octet-stream',
    'Content-Encoding': 'aes128gcm',
    TTL: String(opts.ttlSeconds ?? 24 * 3600),
    Urgency: opts.urgency ?? 'normal',
    Authorization: await vapidAuthorization(sub.endpoint, vapid),
  };
  // Topic permite que un aviso nuevo reemplace al anterior pendiente del mismo tipo.
  if (opts.topic) headers.Topic = opts.topic.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32);
  const res = await fetch(sub.endpoint, { method: 'POST', headers, body: body as BufferSource });
  const text = res.ok ? undefined : await res.text().catch(() => undefined);
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410, body: text };
}

export async function generateVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: bytesToBase64Url(pub), privateKey: jwk.d as string };
}
