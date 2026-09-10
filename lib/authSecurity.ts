import crypto from "crypto";

export interface StoredUser {
  uid: string;
  email: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  role: "patient" | "doctor" | "admin";
  createdAt: string;
}

// Typo mapping for common email domains
const COMMON_DOMAIN_TYPOS: Record<string, string> = {
  "gail.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmial.com": "gmail.com",
  "gmaill.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gmil.com": "gmail.com",
  "gmaol.com": "gmail.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "yaho.co": "yahoo.com",
  "hotmial.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "outloo.com": "outlook.com",
  "icoud.com": "icloud.com",
};

/**
 * Strict RFC 5322 compliant email validation with domain typo detection
 */
export function validateEmailFormat(email: string): {
  valid: boolean;
  error?: string;
  suggestion?: string;
  cleanEmail: string;
} {
  if (!email || typeof email !== "string") {
    return { valid: false, error: "Email is required.", cleanEmail: "" };
  }

  const clean = email.toLowerCase().trim();

  // Basic structure check
  const parts = clean.split("@");
  if (parts.length !== 2) {
    return { valid: false, error: "Please enter a valid email address (e.g. yourname@example.com).", cleanEmail: clean };
  }

  const [localPart, domainPart] = parts;

  if (!localPart || localPart.length > 64) {
    return { valid: false, error: "The email username part is invalid.", cleanEmail: clean };
  }

  if (!domainPart || domainPart.length > 255) {
    return { valid: false, error: "The email domain is invalid.", cleanEmail: clean };
  }

  // Check for domain typo
  if (COMMON_DOMAIN_TYPOS[domainPart]) {
    const suggestedDomain = COMMON_DOMAIN_TYPOS[domainPart];
    const suggestedEmail = `${localPart}@${suggestedDomain}`;
    return {
      valid: false,
      error: `Invalid email domain "@${domainPart}". Did you mean "@${suggestedDomain}"?`,
      suggestion: suggestedEmail,
      cleanEmail: clean,
    };
  }

  // RFC regex check
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: "Please enter a properly formatted email address.", cleanEmail: clean };
  }

  // Verify TLD is at least 2 characters
  const domainSubParts = domainPart.split(".");
  const tld = domainSubParts[domainSubParts.length - 1];
  if (!tld || tld.length < 2 || /^\d+$/.test(tld)) {
    return { valid: false, error: "Email must end with a valid domain extension like .com, .org, or .in.", cleanEmail: clean };
  }

  return { valid: true, cleanEmail: clean };
}

/**
 * PBKDF2 password hashing (10,000 iterations, SHA-512)
 */
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
}

/**
 * Timing-safe password verification to prevent side-channel timing attacks
 */
export function verifyPassword(password: string, salt: string, storedHash: string): boolean {
  try {
    const computedHash = hashPassword(password, salt);
    const computedBuffer = Buffer.from(computedHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (computedBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuffer, storedBuffer);
  } catch {
    return false;
  }
}

// Generate demo accounts
function createDemoAccount(email: string, pass: string, name: string, role: "patient" | "doctor"): StoredUser {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    uid: "user_demo_" + email.replace(/[^a-zA-Z0-9]/g, "_"),
    email,
    passwordHash: hashPassword(pass, salt),
    salt,
    displayName: name,
    role,
    createdAt: new Date().toISOString(),
  };
}

// Global user registry persisted across serverless warm requests
declare global {
  // eslint-disable-next-line no-var
  var _robodoctorUserRegistry: Map<string, StoredUser> | undefined;
}

export function getUserRegistry(): Map<string, StoredUser> {
  if (!globalThis._robodoctorUserRegistry) {
    const registry = new Map<string, StoredUser>();
    
    // Official Pre-Seeded Demo Accounts
    const demoPatient = createDemoAccount("demo@robodoctor.ai", "Demo@2026", "Demo Patient", "patient");
    const demoDoctor = createDemoAccount("doctor@robodoctor.ai", "Doctor@2026", "Dr. Aryan Sharma (Cardiologist)", "doctor");
    const regularPatient = createDemoAccount("patient@robodoctor.ai", "Patient@2026", "Rajesh Verma", "patient");

    registry.set(demoPatient.email, demoPatient);
    registry.set(demoDoctor.email, demoDoctor);
    registry.set(regularPatient.email, regularPatient);

    globalThis._robodoctorUserRegistry = registry;
  }

  return globalThis._robodoctorUserRegistry;
}
