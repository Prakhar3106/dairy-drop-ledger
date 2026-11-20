import { describe, expect, it } from 'vitest';
import { displayLoginId, loginIdentifierToEmail, normaliseMobile } from './identity';

describe('login identifiers', () => {
  it('accepts a 10-digit Indian mobile with or without +91, spaces or a leading 0', () => {
    expect(normaliseMobile('98254 41208')).toBe('919825441208');
    expect(normaliseMobile('+91 98254-41208')).toBe('919825441208');
    expect(normaliseMobile('09825441208')).toBe('919825441208');
    expect(normaliseMobile('12345')).toBeNull();
    expect(normaliseMobile('5825441208')).toBeNull();
  });
  it('maps a mobile number to the same login email every time, and keeps real emails', () => {
    expect(loginIdentifierToEmail('9825441208')).toBe('919825441208@mobile.dairysetu.app');
    expect(loginIdentifierToEmail(' Owner@Dairy.in ')).toBe('owner@dairy.in');
    expect(loginIdentifierToEmail('not-an-id')).toBeNull();
  });
  it('shows mobile logins as a phone number', () => {
    expect(displayLoginId('919825441208@mobile.dairysetu.app')).toBe('+91 98254 41208');
  });
});
