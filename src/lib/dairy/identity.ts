/** Domain used for login accounts that are identified by mobile number only. */
export const MOBILE_LOGIN_DOMAIN = 'mobile.dairysetu.app';

/** Normalises an Indian mobile number to 12 digits (91XXXXXXXXXX), or null when invalid. */
export function normaliseMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith('91') && /^[6-9]/.test(digits.slice(2))) return digits;
  if (digits.length === 11 && digits.startsWith('0') && /^[6-9]/.test(digits.slice(1))) return `91${digits.slice(1)}`;
  return null;
}

export function mobileToLoginEmail(mobile: string): string | null {
  const m = normaliseMobile(mobile);
  return m ? `${m}@${MOBILE_LOGIN_DOMAIN}` : null;
}

/**
 * Converts what a user types into the login box (email or mobile) into the
 * account email used for sign-in. Returns null when it is neither.
 */
export function loginIdentifierToEmail(identifier: string): string | null {
  const value = identifier.trim();
  if (value.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null;
  }
  return mobileToLoginEmail(value);
}

export function isMobileLoginEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith(`@${MOBILE_LOGIN_DOMAIN}`);
}

/** Shows a mobile-login email as the mobile number people actually type. */
export function displayLoginId(email: string | null | undefined): string {
  if (!email) return '';
  if (isMobileLoginEmail(email)) {
    const digits = email.split('@')[0] ?? '';
    return `+${digits.slice(0, 2)} ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return email;
}
