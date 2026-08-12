import { sanitizeEmailHtml } from './htmlSafety';

export const templateNameMaxLength = 120;
export const templateDescriptionMaxLength = 500;
export const templateSubjectMaxLength = 300;
export const templateBodyMaxLength = 200_000;
export const templatePurposeMaxLength = 80;
export const templateLanguageMaxLength = 12;
export const templateTagMaxLength = 40;
export const templateTagMaxCount = 20;

export function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function tags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => text(item)).filter(Boolean))).slice(0, templateTagMaxCount);
}

export function templateContent(body: Record<string, unknown>) {
  const name = text(body.name);
  const description = text(body.description);
  const subject = text(body.subject);
  const bodyHtml = sanitizeEmailHtml(text(body.bodyHtml));
  const language = text(body.language, 'en') || 'en';
  const purpose = text(body.purpose);
  const normalizedTags = tags(body.tags);
  const errors: string[] = [];
  if (!name) errors.push('Template name is required.');
  if (name.length > templateNameMaxLength) errors.push(`Template name must be at most ${templateNameMaxLength} characters.`);
  if (description.length > templateDescriptionMaxLength) errors.push(`Template description must be at most ${templateDescriptionMaxLength} characters.`);
  if (!subject) errors.push('Template subject is required.');
  if (subject.length > templateSubjectMaxLength) errors.push(`Template subject must be at most ${templateSubjectMaxLength} characters.`);
  if (!bodyHtml) errors.push('Template bodyHtml is required.');
  if (bodyHtml.length > templateBodyMaxLength) errors.push(`Template bodyHtml must be at most ${templateBodyMaxLength} characters.`);
  if (language.length > templateLanguageMaxLength) errors.push(`Template language must be at most ${templateLanguageMaxLength} characters.`);
  if (purpose.length > templatePurposeMaxLength) errors.push(`Template purpose must be at most ${templatePurposeMaxLength} characters.`);
  if (normalizedTags.some((tag) => tag.length > templateTagMaxLength)) errors.push(`Each template tag must be at most ${templateTagMaxLength} characters.`);
  if (Array.isArray(body.tags) && body.tags.length > templateTagMaxCount) errors.push(`A template may contain at most ${templateTagMaxCount} tags.`);
  return { data: { name, description, subject, bodyHtml, language, purpose, tags: normalizedTags }, errors };
}
