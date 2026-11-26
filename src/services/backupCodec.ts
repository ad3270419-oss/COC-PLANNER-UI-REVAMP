export const PREFIX = 'CPB1:';

export type DecodeBackupFailureReason = 'empty' | 'cut_off' | 'corrupt' | 'not_json';

export type DecodeBackupResult =
  | { ok: true; data: unknown; format: 'cpb1' | 'json' }
  | { ok: false; reason: DecodeBackupFailureReason; message: string };

const ZERO_WIDTH_AND_BOM_REGEX = /[\u200B-\u200D\u2060\uFEFF]/g;
const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;
const CPB1_EXTRACT_REGEX = /CPB1:[A-Za-z0-9_\-\s]+/;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    let chunkStr = '';
    for (let j = 0; j < slice.length; j++) {
      chunkStr += String.fromCharCode(slice[j]);
    }
    parts.push(chunkStr);
  }
  return btoa(parts.join(''))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array {
  if (!b64url || !BASE64URL_REGEX.test(b64url) || b64url.length % 4 === 1) {
    throw new Error('Invalid base64url payload');
  }
  const base64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function runByteTransform(
  input: Uint8Array,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const readPromise = (async () => {
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.byteLength;
      }
    }
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  })();

  const writePromise = (async () => {
    try {
      await writer.write(input as BufferSource);
      await writer.close();
    } catch (err) {
      try {
        await writer.abort(err);
      } catch {
        // Ignore secondary abort errors
      }
      throw err;
    }
  })();

  const [output] = await Promise.all([readPromise, writePromise]);
  return output;
}

async function compressGzip(bytes: Uint8Array): Promise<Uint8Array> {
  const Ctor = (globalThis as { CompressionStream?: typeof CompressionStream }).CompressionStream;
  if (typeof Ctor !== 'function') {
    throw new Error('CompressionStream unavailable');
  }
  return runByteTransform(bytes, new Ctor('gzip'));
}

async function decompressGzip(bytes: Uint8Array): Promise<Uint8Array> {
  const Ctor = (globalThis as { DecompressionStream?: typeof DecompressionStream }).DecompressionStream;
  if (typeof Ctor !== 'function') {
    throw new Error('DecompressionStream unavailable');
  }
  return runByteTransform(bytes, new Ctor('gzip'));
}

function looksLikeCutOffJson(text: string): boolean {
  if (!text.startsWith('{')) return false;
  if (!text.endsWith('}')) return true;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth < 0) return true;
    }
  }
  return inString || depth !== 0;
}

/**
 * Losslessly encodes a backup object into a compact `CPB1:` gzip+base64url code.
 * Falls back to minified JSON if CompressionStream is unavailable or fails.
 * Never throws.
 */
export async function encodeBackup(obj: unknown): Promise<string> {
  let minified: string;
  try {
    minified = JSON.stringify(obj) ?? 'null';
  } catch {
    return '{}';
  }

  try {
    const utf8 = new TextEncoder().encode(minified);
    const compressed = await compressGzip(utf8);
    const encoded = bytesToBase64Url(compressed);
    return `${PREFIX}${encoded}`;
  } catch {
    return minified;
  }
}

/**
 * Decodes either a `CPB1:` compressed backup code (even if line-wrapped or
 * surrounded by chat text) or a plain pretty/compact JSON backup string.
 * Never throws; returns a discriminated union result.
 */
export async function decodeBackup(text: string): Promise<DecodeBackupResult> {
  try {
    const raw = typeof text === 'string' ? text : '';
    const cleaned = raw.replace(ZERO_WIDTH_AND_BOM_REGEX, '').trim();

    if (!cleaned) {
      return {
        ok: false,
        reason: 'empty',
        message: 'Nothing pasted yet',
      };
    }

    if (cleaned.includes(PREFIX)) {
      const match = cleaned.match(CPB1_EXTRACT_REGEX);
      const afterPrefix = match ? match[0].slice(PREFIX.length) : '';
      const fullPayload = afterPrefix.replace(/\s+/g, '');
      const fullCodeLength = PREFIX.length + fullPayload.length;

      if (!fullPayload) {
        return {
          ok: false,
          reason: 'cut_off',
          message: `Backup code looks cut off or changed (${fullCodeLength} characters). Copy it again and paste the full code`,
        };
      }

      const DecompCtor = (globalThis as { DecompressionStream?: typeof DecompressionStream })
        .DecompressionStream;
      if (typeof DecompCtor !== 'function') {
        return {
          ok: false,
          reason: 'corrupt',
          message:
            'This browser does not support compressed backup codes. Please paste a JSON backup instead.',
        };
      }

      const tokens = afterPrefix.trim().split(/\s+/).filter(Boolean);
      const candidates: string[] = [fullPayload];
      if (tokens.length > 1) {
        if (tokens[0] !== fullPayload) {
          candidates.push(tokens[0]);
        }
        const minEnd = Math.max(2, tokens.length - 64);
        for (let end = tokens.length - 1; end >= minEnd; end--) {
          const joined = tokens.slice(0, end).join('');
          if (joined && !candidates.includes(joined)) {
            candidates.push(joined);
          }
        }
      }

      let sawJsonParseFailure = false;

      for (const candidate of candidates) {
        let decompressedText: string;
        try {
          const bytes = base64UrlToBytes(candidate);
          const inflated = await decompressGzip(bytes);
          decompressedText = new TextDecoder().decode(inflated);
        } catch {
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(decompressedText);
        } catch {
          sawJsonParseFailure = true;
          continue;
        }

        if (!isPlainObject(parsed)) {
          return {
            ok: false,
            reason: 'not_json',
            message: 'Backup code does not contain a valid backup object',
          };
        }

        return {
          ok: true,
          data: parsed,
          format: 'cpb1',
        };
      }

      if (sawJsonParseFailure) {
        return {
          ok: false,
          reason: 'corrupt',
          message: 'Backup code is corrupted. Copy it again and paste the full code',
        };
      }

      return {
        ok: false,
        reason: 'cut_off',
        message: `Backup code looks cut off or changed (${fullCodeLength} characters). Copy it again and paste the full code`,
      };
    }

    // Plain JSON path (pretty or compact)
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      if (looksLikeCutOffJson(cleaned)) {
        return {
          ok: false,
          reason: 'cut_off',
          message: `Backup JSON looks cut off (${cleaned.length} characters). Copy it again and paste the full backup`,
        };
      }
      return {
        ok: false,
        reason: 'not_json',
        message: 'Not a valid backup code or JSON',
      };
    }

    if (!isPlainObject(parsed)) {
      return {
        ok: false,
        reason: 'not_json',
        message: 'Backup must be a JSON object',
      };
    }

    return {
      ok: true,
      data: parsed,
      format: 'json',
    };
  } catch {
    return {
      ok: false,
      reason: 'corrupt',
      message: 'Could not read backup data',
    };
  }
}
