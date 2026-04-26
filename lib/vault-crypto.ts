import crypto from 'crypto';

function keyMaterial() {
  const secret = process.env.VAULT_SECRET;
  if (!secret) throw new Error('VAULT_SECRET is required for password vault encryption');
  return secret;
}

// Cache the derived key so scryptSync runs only once per process startup
let _cachedKey: Buffer | null = null;
let _cachedMaterial: string | null = null;

function deriveKey() {
  const material = keyMaterial();
  if (_cachedKey && _cachedMaterial === material) return _cachedKey;
  _cachedKey = crypto.scryptSync(material, 'kuma-suite-salt', 32);
  _cachedMaterial = material;
  return _cachedKey;
}

export function encryptSecret(plaintext: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function decryptSecret(payload: string) {
  if (!payload) return '';
  const raw = Buffer.from(payload, 'base64url');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const data = raw.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
