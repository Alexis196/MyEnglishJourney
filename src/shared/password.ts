/**
 * Password policy shared by the register and reset-password flows (client-side UX).
 *
 * NOTE: this runs in the browser, so it guides users but cannot stop someone calling Supabase Auth directly.
 * The enforced minimum lives in the Supabase dashboard (Authentication > Sign In / Providers > Email >
 * password requirements); keep that setting at least as strict as the rules below.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72; // bcrypt (used by Supabase Auth) ignores everything past 72 bytes

/** Whole-password matches (case-insensitive) that appear in every "most common passwords" list. */
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "11111111",
  "00000000",
  "87654321",
  "12341234",
  "1q2w3e4r",
  "1qaz2wsx",
  "qwerty123",
  "password1",
  "password123",
  "abc12345",
  "iloveyou1",
  "contrasena1",
]);

/** Weak "root" words: a password that is just one of these plus digits/symbols/leetspeak is still weak. */
const WEAK_ROOTS = new Set([
  "password",
  "passw",
  "qwerty",
  "qwertyuiop",
  "asdfgh",
  "asdfghjkl",
  "zxcvbn",
  "admin",
  "administrator",
  "welcome",
  "letmein",
  "iloveyou",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "master",
  "login",
  "secret",
  "contrasena",
  "contrasenia",
  "contrasea",
  "clave",
  "hola",
  "holamundo",
  "usuario",
  "root",
  "ingles",
  "english",
  "englishjourney",
  "myenglishjourney",
]);

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", $: "s" };

function lettersOnly(value: string): string {
  return value.replace(/[^\p{L}]/gu, "");
}

function isStraightRun(value: string): boolean {
  const chars = value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (chars.length < 4) return false;
  const codes = Array.from(chars).map((c) => c.codePointAt(0) ?? 0);
  const step = (codes[1] ?? 0) - (codes[0] ?? 0);
  if (Math.abs(step) !== 1 && step !== 0) return false; // 0 = repeated character
  return codes.every((code, i) => i === 0 || code - (codes[i - 1] ?? 0) === step);
}

/** True for predictable passwords: common ones, a single repeated/sequential run, or a weak word with decoration. */
export function isWeakPassword(password: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) return true;
  if (isStraightRun(password)) return true;

  // Drop trailing decoration ("password123!" -> "password") before comparing, then also try leetspeak ("p4ssw0rd").
  const base = lower.replace(/[^\p{L}]+$/u, "");
  const plain = lettersOnly(base);
  const leet = lettersOnly(Array.from(base).map((c) => LEET[c] ?? c).join(""));
  return WEAK_ROOTS.has(plain) || WEAK_ROOTS.has(leet);
}

export interface PasswordRule {
  id: "length" | "lower" | "upper" | "number" | "symbol" | "common";
  /** Short text for the requirements checklist. */
  label: string;
  /** Message shown as the field error when this is the first unmet rule. */
  message: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    message: `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "lower",
    label: "Una letra minúscula",
    message: "Agregá al menos una letra minúscula",
    test: (pw) => /\p{Ll}/u.test(pw),
  },
  {
    id: "upper",
    label: "Una letra mayúscula",
    message: "Agregá al menos una letra mayúscula",
    test: (pw) => /\p{Lu}/u.test(pw),
  },
  {
    id: "number",
    label: "Un número",
    message: "Agregá al menos un número",
    test: (pw) => /\p{N}/u.test(pw),
  },
  {
    id: "symbol",
    label: "Un símbolo (! ? - _ . @ #)",
    message: "Agregá al menos un símbolo (por ejemplo ! ? - _ . @ #)",
    test: (pw) => /[^\p{L}\p{N}\s]/u.test(pw),
  },
  {
    id: "common",
    label: "Que no sea común ni fácil de adivinar",
    message: "Esa contraseña es demasiado común o predecible. Elegí otra.",
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH && !isWeakPassword(pw),
  },
];

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  level: PasswordStrengthLevel;
  label: string;
  met: Record<PasswordRule["id"], boolean>;
  isValid: boolean;
}

const LEVEL_LABELS: Record<PasswordStrengthLevel, string> = {
  0: "",
  1: "Débil",
  2: "Media",
  3: "Fuerte",
  4: "Muy fuerte",
};

export function evaluatePassword(password: string): PasswordStrength {
  const met = Object.fromEntries(PASSWORD_RULES.map((rule) => [rule.id, rule.test(password)])) as PasswordStrength["met"];
  const metCount = PASSWORD_RULES.filter((rule) => met[rule.id]).length;
  const isValid = metCount === PASSWORD_RULES.length && password.length <= PASSWORD_MAX_LENGTH;

  let level: PasswordStrengthLevel;
  if (password.length === 0) level = 0;
  else if (!isValid) level = metCount >= 4 ? 2 : 1;
  else level = password.length >= 12 ? 4 : 3;

  return { level, label: LEVEL_LABELS[level], met, isValid };
}

/** First unmet rule's message, or null when the password satisfies the whole policy. */
export function firstPasswordProblem(password: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) return "La contraseña es demasiado larga";
  const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
  return failed ? failed.message : null;
}
