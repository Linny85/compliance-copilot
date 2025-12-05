/**
 * Canonical JSON serialization for deterministic hashing
 * Ensures consistent output by sorting object keys
 */
export function canonicalJSON(input: unknown): string {
  if (input === null) return 'null';
  if (input === undefined) return 'null';
  if (typeof input === 'boolean') return String(input);
  if (typeof input === 'number') return String(input);
  if (typeof input === 'string') return JSON.stringify(input);
  
  if (Array.isArray(input)) {
    return '[' + input.map(canonicalJSON).join(',') + ']';
  }
  
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => `"${k}":${canonicalJSON(obj[k])}`).join(',') + '}';
  }
  
  return 'null';
}

/**
 * Compute SHA-256 hash and return as hex string
 */
export async function sha256Hex(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Sign bundle hash with Ed25519
 * Requires AUDIT_SIGN_PRIV_BASE64 and AUDIT_SIGN_PUB_BASE64 env vars
 */
export async function signBundleHashEd25519(bundleHashHex: string): Promise<{
  alg: string;
  sig?: string;
  pubkey_b64?: string;
  note?: string;
}> {
  const privB64 = Deno.env.get('AUDIT_SIGN_PRIV_BASE64');
  const pubB64 = Deno.env.get('AUDIT_SIGN_PUB_BASE64');
  
  if (!privB64 || !pubB64) {
    return {
      alg: 'none',
      note: 'Signing keys not configured. Set AUDIT_SIGN_PRIV_BASE64 and AUDIT_SIGN_PUB_BASE64 environment variables.',
    };
  }

  try {
    // Convert hex hash to bytes
    const hexToBytes = (hex: string) =>
      new Uint8Array(hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
    
    const data = hexToBytes(bundleHashHex);

    // Decode base64 keys to raw bytes
    const rawPriv = Uint8Array.from(atob(privB64), c => c.charCodeAt(0));
    const rawPub = Uint8Array.from(atob(pubB64), c => c.charCodeAt(0));

    // Import private key for signing
    const privKey = await crypto.subtle.importKey(
      'pkcs8',
      rawPriv.buffer,
      { name: 'Ed25519' },
      false,
      ['sign']
    );

    // Sign the hash
    const sigBuffer = await crypto.subtle.sign('Ed25519', privKey, data);
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

    return {
      alg: 'Ed25519',
      sig: sigB64,
      pubkey_b64: pubB64,
    };
  } catch (error: unknown) {
    console.error('[crypto] Signing failed:', error);
    return {
      alg: 'none',
      note: `Signing failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Verify Ed25519 signature (for testing/validation)
 */
export async function verifySignatureEd25519(
  bundleHashHex: string,
  signatureB64: string,
  publicKeyB64: string
): Promise<boolean> {
  try {
    const hexToBytes = (hex: string) =>
      new Uint8Array(hex.match(/.{1,2}/g)?.map(b => parseInt(b, 16)) || []);
    
    const data = hexToBytes(bundleHashHex);
    const signature = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const rawPub = Uint8Array.from(atob(publicKeyB64), c => c.charCodeAt(0));

    const pubKey = await crypto.subtle.importKey(
      'spki',
      rawPub.buffer,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    return await crypto.subtle.verify('Ed25519', pubKey, signature, data);
  } catch (error: unknown) {
    console.error('[crypto] Verification failed:', error);
    return false;
  }
}
