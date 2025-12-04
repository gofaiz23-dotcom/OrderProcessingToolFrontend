/**
 * Estes Authentication Field Definitions
 * Based on backend ShippingDB.js configuration
 */

export interface EstesAuthFields {
  username: string;
  password: string;
}

export const ESTES_AUTH_FIELD_DEFAULTS: EstesAuthFields = {
  username: '',
  password: '',
};

export const ESTES_AUTH_FIELD_LABELS: Record<keyof EstesAuthFields, string> = {
  username: 'Username',
  password: 'Password',
};

export const ESTES_AUTH_FIELD_PLACEHOLDERS: Record<keyof EstesAuthFields, string> = {
  username: 'Enter your Estes username',
  password: 'Enter your Estes password',
};

export const ESTES_AUTH_FIELD_TYPES: Record<keyof EstesAuthFields, 'text' | 'password' | 'email' | 'number'> = {
  username: 'text',
  password: 'password',
};

export const ESTES_AUTH_REQUIRED_FIELDS: (keyof EstesAuthFields)[] = ['username', 'password'];

