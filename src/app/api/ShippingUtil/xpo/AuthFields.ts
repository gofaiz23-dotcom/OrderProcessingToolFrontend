/**
 * XPO Authentication Field Definitions
 * Based on backend ShippingDB.js configuration
 */

export interface XPOAuthFields {
  username: string;
  password: string;
}

export const XPO_AUTH_FIELD_DEFAULTS: XPOAuthFields = {
  username: '',
  password: '',
};

export const XPO_AUTH_FIELD_LABELS: Record<keyof XPOAuthFields, string> = {
  username: 'Username',
  password: 'Password',
};

export const XPO_AUTH_FIELD_PLACEHOLDERS: Record<keyof XPOAuthFields, string> = {
  username: 'Enter your XPO username',
  password: 'Enter your XPO password',
};

export const XPO_AUTH_FIELD_TYPES: Record<keyof XPOAuthFields, 'text' | 'password' | 'email' | 'number'> = {
  username: 'text',
  password: 'password',
};

export const XPO_AUTH_REQUIRED_FIELDS: (keyof XPOAuthFields)[] = ['username', 'password'];

