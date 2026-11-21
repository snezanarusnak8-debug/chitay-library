import {openDB, DBSchema, IDBPDatabase} from 'idb';
import {ActiveSession, UserAccount} from '../types/library';

interface VellumAuthDB extends DBSchema {
  accounts: {
    key: string;
    value: UserAccount;
    indexes: {'by-nicknameKey': string};
  };
  sessions: {
    key: string;
    value: ActiveSession;
  };
}

const AUTH_DB_NAME = 'vellum_auth_db';
const AUTH_DB_VERSION = 1;
const PBKDF2_ITERATIONS = 120000;

let authDbPromise: Promise<IDBPDatabase<VellumAuthDB>> | null = null;

async function getAuthDB(): Promise<IDBPDatabase<VellumAuthDB>> {
  if (!authDbPromise) {
    authDbPromise = openDB<VellumAuthDB>(AUTH_DB_NAME, AUTH_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('accounts')) {
          const store = db.createObjectStore('accounts', {keyPath: 'id'});
          store.createIndex('by-nicknameKey', 'nicknameKey', {unique: true});
        }
        if (!db.objectStoreNames.contains('sessions')) {
          db.createObjectStore('sessions', {keyPath: 'id'});
        }
      },
    });
  }
  return authDbPromise;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function generateSaltHex(length = 16): string {
  const buf = new Uint8Array(length);
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    window.crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < length; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(buf);
}

// Pure JS SHA-256 + PBKDF2 fallback when crypto.subtle is unavailable (e.g. non-HTTPS local LAN IP)
function sha256BytesFallback(data: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const H = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const bitLen = data.length * 8;
  const paddedLen = Math.ceil((data.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);
  view.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);

  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  for (let i = 0; i < 8; i++) outView.setUint32(i * 4, H[i], false);
  return out;
}

function hmacSha256Fallback(key: Uint8Array, msg: Uint8Array): Uint8Array {
  const k = key.length > 64 ? sha256BytesFallback(key) : key;
  const oPad = new Uint8Array(64).fill(0x5c);
  const iPad = new Uint8Array(64).fill(0x36);
  for (let i = 0; i < k.length; i++) {
    oPad[i] ^= k[i];
    iPad[i] ^= k[i];
  }
  const inner = new Uint8Array(64 + msg.length);
  inner.set(iPad);
  inner.set(msg, 64);
  const innerHash = sha256BytesFallback(inner);
  const outer = new Uint8Array(64 + 32);
  outer.set(oPad);
  outer.set(innerHash, 64);
  return sha256BytesFallback(outer);
}

async function derivePasswordHash(
  password: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);
  const saltBytes = hexToBytes(saltHex);

  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBytes,
      {name: 'PBKDF2'},
      false,
      ['deriveBits']
    );
    const derived = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: saltBytes.buffer as ArrayBuffer,
        iterations,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    return bytesToHex(new Uint8Array(derived));
  }

  // Fallback PBKDF2-HMAC-SHA256
  const fallbackRounds = Math.min(iterations, 25000);
  const block1 = new Uint8Array(saltBytes.length + 4);
  block1.set(saltBytes);
  block1[saltBytes.length + 3] = 1;
  let u = hmacSha256Fallback(passwordBytes, block1);
  const t = new Uint8Array(u);
  for (let i = 1; i < fallbackRounds; i++) {
    u = hmacSha256Fallback(passwordBytes, u);
    for (let j = 0; j < t.length; j++) t[j] ^= u[j];
  }
  return bytesToHex(t);
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function normalizeNicknameKey(nickname: string): string {
  return nickname.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function validateNickname(rawNickname: string): {valid: boolean; clean: string; error?: string} {
  const clean = rawNickname.trim().replace(/\s+/g, ' ');
  if (clean.length < 2) {
    return {valid: false, clean, error: 'Никнейм должен содержать минимум 2 символа'};
  }
  if (clean.length > 32) {
    return {valid: false, clean, error: 'Никнейм не должен превышать 32 символа'};
  }
  if (!/^[\p{L}\p{N}._\- ]+$/u.test(clean)) {
    return {
      valid: false,
      clean,
      error: 'Разрешены буквы, цифры, пробелы и символы . _ -',
    };
  }
  return {valid: true, clean};
}

export interface PasswordStrengthResult {
  valid: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hints: string[];
}

const WEAK_PASSWORDS = new Set(['123456', '12345678', 'qwerty', 'password', 'пароль', '111111', '000000']);

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hints: string[] = [];
  if (password.length < 6) {
    hints.push('Минимум 6 символов для защиты библиотеки');
  }
  if (WEAK_PASSWORDS.has(password.toLowerCase())) {
    hints.push('Этот пароль слишком часто угадывают — придумайте более уникальный');
  }
  const hasDigit = /\d/.test(password);
  const hasLetter = /\p{L}/u.test(password);
  const hasUpperOrSymbol = /[\p{Lu}!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/u.test(password);

  if (!hasDigit) hints.push('Добавьте хотя бы одну цифру');
  if (!hasLetter) hints.push('Добавьте буквы');
  if (!hasUpperOrSymbol && password.length < 10) {
    hints.push('Заглавная буква или спецсимвол усилят пароль');
  }

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  if (password.length >= 6 && !WEAK_PASSWORDS.has(password.toLowerCase())) {
    score = 1;
    if (hasDigit && hasLetter) score = 2;
    if (password.length >= 8 && (hasUpperOrSymbol || (hasDigit && hasLetter))) score = 3;
    if (password.length >= 10 && hasDigit && hasLetter && hasUpperOrSymbol) score = 4;
  }

  const labels: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: password.length === 0 ? 'Введите пароль' : 'Слишком слабый пароль',
    1: 'Слабый',
    2: 'Средний',
    3: 'Надёжный',
    4: 'Отличный',
  };

  return {
    valid: password.length >= 6 && !WEAK_PASSWORDS.has(password.toLowerCase()),
    score,
    label: labels[score],
    hints,
  };
}

export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  const {valid, clean} = validateNickname(nickname);
  if (!valid) return false;
  const db = await getAuthDB();
  const key = normalizeNicknameKey(clean);
  const existing = await db.getFromIndex('accounts', 'by-nicknameKey', key);
  return !existing;
}

export async function registerAccount(nicknameRaw: string, password: string): Promise<UserAccount> {
  const nickCheck = validateNickname(nicknameRaw);
  if (!nickCheck.valid) {
    throw new Error(nickCheck.error || 'Некорректный никнейм');
  }
  const pwCheck = evaluatePasswordStrength(password);
  if (!pwCheck.valid) {
    throw new Error(pwCheck.hints[0] || 'Пароль слишком слабый (минимум 6 символов)');
  }

  const db = await getAuthDB();
  const nicknameKey = normalizeNicknameKey(nickCheck.clean);
  const existing = await db.getFromIndex('accounts', 'by-nicknameKey', nicknameKey);
  if (existing) {
    throw new Error('Этот никнейм уже занят. Выберите другой или войдите в аккаунт');
  }

  const salt = generateSaltHex(16);
  const iterations = typeof window !== 'undefined' && window.crypto?.subtle ? PBKDF2_ITERATIONS : 25000;
  const passwordHash = await derivePasswordHash(password, salt, iterations);

  const now = Date.now();
  const account: UserAccount = {
    id: `acc_${now}_${Math.random().toString(36).slice(2, 8)}`,
    nickname: nickCheck.clean,
    nicknameKey,
    passwordHash,
    passwordSalt: salt,
    iterations,
    createdAt: now,
    lastLoginAt: now,
  };

  await db.put('accounts', account);
  await db.put('sessions', {
    id: 'current',
    accountId: account.id,
    nickname: account.nickname,
    createdAt: now,
  });

  return account;
}

export async function loginAccount(nicknameRaw: string, password: string): Promise<UserAccount> {
  const clean = nicknameRaw.trim().replace(/\s+/g, ' ');
  if (!clean) {
    throw new Error('Введите никнейм');
  }
  if (!password) {
    throw new Error('Введите пароль');
  }

  const db = await getAuthDB();
  const key = normalizeNicknameKey(clean);
  const account = await db.getFromIndex('accounts', 'by-nicknameKey', key);
  if (!account) {
    throw new Error('Аккаунт с таким никнеймом не найден');
  }

  const candidateHash = await derivePasswordHash(password, account.passwordSalt, account.iterations);
  if (!constantTimeEqualHex(candidateHash, account.passwordHash)) {
    throw new Error('Неверный пароль');
  }

  const now = Date.now();
  const updated: UserAccount = {...account, lastLoginAt: now};
  await db.put('accounts', updated);
  await db.put('sessions', {
    id: 'current',
    accountId: updated.id,
    nickname: updated.nickname,
    createdAt: now,
  });

  return updated;
}

export async function getCurrentSessionAccount(): Promise<UserAccount | null> {
  const db = await getAuthDB();
  const session = await db.get('sessions', 'current');
  if (!session) return null;
  const account = await db.get('accounts', session.accountId);
  if (!account) {
    await db.delete('sessions', 'current');
    return null;
  }
  return account;
}

export async function logoutAccount(): Promise<void> {
  const db = await getAuthDB();
  await db.delete('sessions', 'current');
}
