import sanitizeHtml from 'sanitize-html';
import {chapterHtmlPolicy, cleanHtml} from './content';
import {isLegacyImageUrl, legacyImagePath} from './legacy-image-url';

type Attributes = Record<string, string>;
type Frame = {tag: string; attribs: Attributes; text: string};

type Subtree = {
  oldImage: boolean;
  placeholder: boolean;
  discardedHere: boolean;
  visibleContent: boolean;
};

// Pure reader projection. Never persist this output or use it to hydrate an editor.
// The first pass applies the existing author-content policy. Consequently our
// stack in the second pass only sees well-balanced, allowlisted reader markup.
export function publicChapterHtml(rawHtml: string, origin?: string): string {
  const stack: Subtree[] = [];
  let closing: Subtree | undefined;
  return sanitizeHtml(cleanHtml(rawHtml), {
    ...chapterHtmlPolicy,
    onOpenTag(tag: string, attrs: Attributes) {
      const oldImage = tag === 'img' && isLegacyImageUrl(attrs.src, origin);
      const placeholder = (attrs.class || '').split(/[\t\n\f\r ]+/).includes('hb-shot-placeholder');
      stack.push({oldImage, placeholder, discardedHere: oldImage || placeholder, visibleContent: tag === 'img' && !oldImage});
    },
    textFilter(escaped: string) {
      if (stack.length && escaped.trim()) stack[stack.length - 1].visibleContent = true;
      return escaped;
    },
    // sanitize-html calls this before exclusiveFilter for the same element.
    onCloseTag() { closing = stack.pop(); },
    exclusiveFilter(frame: Frame) {
      const node = closing!;
      const retired = node.oldImage || node.placeholder;
      const screenshotFigure = frame.tag === 'figure' && (frame.attribs['data-content-block'] === 'screenshot'
        || frame.attribs['data-shot-id'] !== undefined || /(?:^|[\t\n\f\r ])(?:shot|hb-screenshot)(?:[\t\n\f\r ]|$)/.test(frame.attribs.class || ''));
      const discard = node.discardedHere || (frame.tag === 'figure' && (node.oldImage
        || (node.placeholder && (screenshotFigure || !node.visibleContent))))
        || (frame.tag === 'a' && retired && !node.visibleContent && !frame.text.trim());
      const parent = stack[stack.length - 1];
      if (parent) {
        parent.oldImage ||= node.oldImage;
        parent.placeholder ||= node.placeholder;
        // A caption alone should not keep a figure whose sole image was a placeholder.
        parent.visibleContent ||= !discard && frame.tag !== 'figcaption' && node.visibleContent;
      }
      if (discard) return true;
      // A link to a retired file may also contain useful text or a new image.
      // Remove its dead destination without throwing away those children.
      if (frame.tag === 'a' && isLegacyImageUrl(frame.attribs.href, origin)) return 'excludeTag';
      return false;
    },
  });
}

// Count references by attribute kind and canonical file path, not by markup,
// query string, hash, or source spelling. Reordering an old block is harmless;
// pasting a second copy or substituting a different retired file is not.
function referenceCounts(html: string, origin?: string): Map<string, number> {
  const counts = new Map<string, number>();
  sanitizeHtml(html, {
    ...chapterHtmlPolicy,
    exclusiveFilter({tag, attribs}: Frame) {
      if (tag === 'img' || tag === 'a') {
        const path = legacyImagePath(tag === 'img' ? attribs.src : attribs.href, origin);
        if (path !== null) {
          const key = tag + ':' + path;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      }
      return false;
    },
  });
  return counts;
}

export function addedLegacyImageReferences(previous: string, next: string, origin?: string): boolean {
  if (previous === next) return false;
  const after = referenceCounts(next, origin);
  if (!after.size) return false;
  const before = referenceCounts(previous, origin);
  return Array.from(after).some(([key, count]) => count > (before.get(key) || 0));
}
