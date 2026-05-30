import { z } from 'zod';

// eslint-disable-next-line no-control-regex -- This sanitizer intentionally removes unsafe control characters.
const CONTROL_CHARS_EXCEPT_SAFE_WHITESPACE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]',
  'g'
);
const BIDI_CONTROL_CHARS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const DANGEROUS_HTML_BLOCKS =
  /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_SELF_CLOSING_TAGS =
  /<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select|option)\b[^>]*\/?\s*>/gi;
const HTML_TAGS = /<[^>]+>/g;
const EVENT_HANDLER_TEXT = /\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL_TEXT = /\bjavascript\s*:/gi;
const DATA_HTML_URL_TEXT = /\bdata\s*:\s*text\/html/gi;

type SanitizeUserContentOptions = {
  maxLength?: number;
  preserveLineBreaks?: boolean;
};

export function sanitizeUserContent(value: string, options: SanitizeUserContentOptions = {}) {
  const preserveLineBreaks = options.preserveLineBreaks ?? true;
  const normalized = value
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_EXCEPT_SAFE_WHITESPACE, '')
    .replace(BIDI_CONTROL_CHARS, '')
    .replace(DANGEROUS_HTML_BLOCKS, '')
    .replace(DANGEROUS_SELF_CLOSING_TAGS, '')
    .replace(EVENT_HANDLER_TEXT, '')
    .replace(JAVASCRIPT_URL_TEXT, '')
    .replace(DATA_HTML_URL_TEXT, 'data:text/plain')
    .replace(HTML_TAGS, ' ');

  const whitespaceNormalized = preserveLineBreaks
    ? normalized
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .replace(/\n{4,}/g, '\n\n\n')
    : normalized.replace(/\s+/g, ' ');

  const trimmed = whitespaceNormalized.trim();
  return options.maxLength ? trimmed.slice(0, options.maxLength) : trimmed;
}

export function sanitizeIdentifierLike(value: string) {
  return value
    .normalize('NFC')
    .trim()
    .replace(CONTROL_CHARS_EXCEPT_SAFE_WHITESPACE, '')
    .replace(BIDI_CONTROL_CHARS, '');
}

export function sanitizedText(options: {
  min?: number;
  max?: number;
  preserveLineBreaks?: boolean;
}) {
  const min = options.min ?? 0;
  const max = options.max;
  let stringSchema = z.string().min(min);

  if (max !== undefined) {
    stringSchema = stringSchema.max(max);
  }

  return z
    .string()
    .transform((value) =>
      sanitizeUserContent(value, {
        maxLength: max,
        preserveLineBreaks: options.preserveLineBreaks,
      })
    )
    .pipe(stringSchema);
}

export function optionalSanitizedText(options: {
  min?: number;
  max?: number;
  preserveLineBreaks?: boolean;
}) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const sanitized = sanitizeUserContent(value, {
      maxLength: options.max,
      preserveLineBreaks: options.preserveLineBreaks,
    });

    return sanitized ? value : undefined;
  }, sanitizedText(options).optional());
}

export function sanitizedIdentifier(options: { min?: number; max?: number } = {}) {
  const min = options.min ?? 0;
  const max = options.max;
  let stringSchema = z.string().min(min);

  if (max !== undefined) {
    stringSchema = stringSchema.max(max);
  }

  return z.string().transform(sanitizeIdentifierLike).pipe(stringSchema);
}

export function optionalSanitizedIdentifier(options: { min?: number; max?: number } = {}) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') {
      return value;
    }

    return sanitizeIdentifierLike(value) ? value : undefined;
  }, sanitizedIdentifier(options).optional());
}
