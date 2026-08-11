import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  'p', 'br', 'strong', 'b', 'em', 'i', 's', 'u',
  'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li',
  'pre', 'code', 'hr', 'a', 'span',
];

export function sanitizeEmailHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags,
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attributes) => ({
        tagName: 'a',
        attribs: {
          ...attributes,
          ...(attributes.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
        },
      }),
    },
  }).trim();
}
