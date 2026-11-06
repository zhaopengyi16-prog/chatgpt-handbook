import sanitizeHtml from 'sanitize-html';
export const chapterHtmlPolicy = {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'figure', 'figcaption', 'details', 'summary', 'section', 'aside', 'button', 'span', 'div', 'h1'],
    allowedAttributes: { '*': ['class', 'id', 'data-content-block', 'data-block-id'], a: ['href', 'title', 'target', 'rel', 'aria-label'], img: ['src', 'alt', 'width', 'height', 'loading'], figure: ['data-shot-id'], button: ['type', 'class'], details: ['open'], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan'], span: ['aria-hidden'] },
    allowedSchemes: ['https', 'http', 'mailto'], allowedSchemesByTag: { img: ['https', 'http'] }, allowProtocolRelative: false,
    transformTags: { a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }), button: sanitizeHtml.simpleTransform('button', { type: 'button' }) },
};
export function cleanHtml(input: string) {
  return sanitizeHtml(input, chapterHtmlPolicy);
}
export const CATEGORIES = ['使用求助', '经验分享', '内容纠错', '功能建议'];
