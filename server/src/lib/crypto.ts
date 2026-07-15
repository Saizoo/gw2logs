import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

// GW2 API keys grant read access to the linked account (and whatever scopes
// the user selected) — encrypted at rest as defense in depth even though the
// key material and the ciphertext both ultimately live on this server.
const secret = process.env.ENCRYPTION_KEY;
if (!secret) {
  throw new Error('ENCRYPTION_KEY environment variable is required to encrypt stored API keys');
}
const key = scryptSync(secret, 'gw2logs-api-key-encryption', 32);

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString('base64');
}

export function decrypt(encoded: string): string {
  const raw = Buffer.from(encoded, 'base64');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
