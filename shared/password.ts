/**
 * Password rules for new accounts, shared by the API (which enforces them) and the
 * sign-up form (which shows them as a live checklist). Existing passwords are not
 * re-checked at login.
 */

export const MIN_PASSWORD_LENGTH = 10;

// Frequently breached choices; compared case-insensitively, with trailing digits and symbols removed.
const COMMON_PASSWORDS = new Set([
  "password", "passw0rd", "qwerty", "qwertyuiop", "asdfgh", "zxcvbn", "abc", "abcdef", "abcd",
  "letmein", "welcome", "iloveyou", "admin", "administrator", "login", "monkey", "dragon",
  "football", "baseball", "sunshine", "princess", "shadow", "superman", "master", "trustno",
  "starwars", "whatever", "freedom", "hello", "secret", "changeme", "default", "test", "guest",
  "zanzibar", "zanzibarguide", "tanzania", "travel", "holiday", "cassava",
]);

export interface PasswordRule {
  id: "length" | "mix" | "common" | "email";
  /** Checklist wording, e.g. "At least 10 characters" */
  label: string;
  /** Sentence shown when the rule is the reason a password is rejected */
  error: string;
  passes: (password: string, email: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    passes: (password) => password.length >= MIN_PASSWORD_LENGTH,
  },
  {
    id: "mix",
    label: "Letters and numbers",
    error: "Password must include both letters and numbers",
    passes: (password) => /[a-z]/i.test(password) && /\d/.test(password),
  },
  {
    id: "common",
    label: "Not a common password",
    error: "That password is too common. Choose something harder to guess",
    passes: (password) => {
      const lower = password.toLowerCase();
      const stem = lower.replace(/[\d\W_]+$/, "");
      return !COMMON_PASSWORDS.has(lower) && !COMMON_PASSWORDS.has(stem) && !/^\d+$/.test(lower);
    },
  },
  {
    id: "email",
    label: "Not your email name",
    error: "Password must not contain the name part of your email",
    passes: (password, email) => {
      const name = email.split("@")[0]?.trim().toLowerCase() ?? "";
      return name.length < 3 || !password.toLowerCase().includes(name);
    },
  },
];

export function unmetPasswordRules(password: string, email = ""): PasswordRule[] {
  return PASSWORD_RULES.filter((rule) => !rule.passes(password, email));
}
