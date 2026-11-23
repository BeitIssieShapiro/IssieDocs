// Styled ranges inside a text box: each span overrides the text's own style for [start, end).
// Spans are kept sorted, non-overlapping, non-empty, and neighbours with the same style merged.

export interface SpanStyle {
    color?: string;
    fontSize?: number; // normalized, like SketchText.fontSize
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
}

export interface TextSpan extends SpanStyle {
    start: number;
    end: number;
}

export interface TextSegment {
    text: string;
    start: number;
    style: SpanStyle;
}

const STYLE_KEYS: (keyof SpanStyle)[] = ["color", "fontSize", "bold", "italic", "underline"];

const styleOf = (s: SpanStyle): SpanStyle => {
    const out: SpanStyle = {};
    for (const k of STYLE_KEYS) if (s[k] !== undefined) (out as any)[k] = s[k];
    return out;
};
const sameStyle = (a: SpanStyle, b: SpanStyle) => STYLE_KEYS.every(k => a[k] === b[k]);
const isEmptyStyle = (s: SpanStyle) => STYLE_KEYS.every(k => s[k] === undefined);

function normalize(spans: TextSpan[]): TextSpan[] {
    const out: TextSpan[] = [];
    for (const s of [...spans].sort((a, b) => a.start - b.start)) {
        if (s.end <= s.start || isEmptyStyle(s)) continue;
        const last = out[out.length - 1];
        if (last && last.end === s.start && sameStyle(last, s)) {
            last.end = s.end;
        } else {
            out.push({ ...styleOf(s), start: s.start, end: s.end });
        }
    }
    return out;
}

/** The style at each character: one entry per character (undefined: the text's own style) */
function perChar(spans: TextSpan[] | undefined, length: number): (SpanStyle | undefined)[] {
    const chars: (SpanStyle | undefined)[] = new Array(length).fill(undefined);
    for (const s of spans ?? []) {
        for (let i = Math.max(0, s.start); i < Math.min(length, s.end); i++) chars[i] = styleOf(s);
    }
    return chars;
}

function fromPerChar(chars: (SpanStyle | undefined)[]): TextSpan[] {
    return normalize(chars.map((st, i) => ({ ...(st ?? {}), start: i, end: i + 1 })));
}

/**
 * Sets style attributes on [start, end). An attribute set to undefined goes back to the text's own style.
 */
export function applySpanStyle(spans: TextSpan[] | undefined, length: number, start: number, end: number,
    patch: SpanStyle): TextSpan[] | undefined {
    const chars = perChar(spans, length);
    for (let i = Math.max(0, start); i < Math.min(length, end); i++) {
        const next: SpanStyle = { ...(chars[i] ?? {}) };
        for (const k of Object.keys(patch) as (keyof SpanStyle)[]) {
            if (patch[k] === undefined) delete next[k];
            else (next as any)[k] = patch[k];
        }
        chars[i] = next;
    }
    const result = fromPerChar(chars);
    return result.length ? result : undefined;
}

/** The effective value of a style attribute at a character */
export function styleAt(spans: TextSpan[] | undefined, index: number): SpanStyle {
    const s = spans?.find(sp => index >= sp.start && index < sp.end);
    return s ? styleOf(s) : {};
}

/**
 * Keeps the spans on the same characters after the text changed from oldText to newText
 * (one edit: a replaced range). `edited`: the selection the edit replaced, when known - with
 * repeated characters the change alone does not tell where it was. Typed characters take the
 * style of the first character they replace, or (inserted) of the character before them.
 */
export function updateSpansForEdit(spans: TextSpan[] | undefined, oldText: string, newText: string,
    edited?: { start: number; end: number }): TextSpan[] | undefined {
    if (!spans?.length || oldText === newText) return spans;
    let prefix = 0, suffix = 0;
    const fits = (r: { start: number; end: number }) => r.start >= 0 && r.start <= r.end && r.end <= oldText.length &&
        newText.length >= r.start + oldText.length - r.end &&
        newText.startsWith(oldText.substring(0, r.start)) && newText.endsWith(oldText.substring(r.end));
    // a cursor (no selection) and characters gone: a backspace before it, or a forward delete after it
    const gone = oldText.length - newText.length;
    const candidates = !edited ? [] : edited.start === edited.end && gone > 0 ?
        [{ start: edited.start - gone, end: edited.start }, { start: edited.start, end: edited.start + gone }] : [edited];
    const range = candidates.find(fits);
    if (range) {
        prefix = range.start;
        suffix = oldText.length - range.end;
    } else {
        // where the text changed: the longest common start, then end
        while (prefix < oldText.length && prefix < newText.length && oldText[prefix] === newText[prefix]) prefix++;
        while (suffix < oldText.length - prefix && suffix < newText.length - prefix &&
            oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix++;
    }

    const chars = perChar(spans, oldText.length);
    const inserted = newText.length - prefix - suffix;
    const replaced = oldText.length - prefix - suffix;
    const inherit = replaced > 0 || prefix === 0 ? chars[prefix] : chars[prefix - 1];
    const next = [
        ...chars.slice(0, prefix),
        ...new Array(inserted).fill(inherit),
        ...chars.slice(oldText.length - suffix),
    ];
    const result = fromPerChar(next);
    return result.length ? result : undefined;
}

/** The text split by style, for rendering. Without spans: one segment */
export function textSegments(text: string, spans: TextSpan[] | undefined): TextSegment[] {
    if (!spans?.length) return [{ text, start: 0, style: {} }];
    const segments: TextSegment[] = [];
    let pos = 0;
    for (const s of normalize(spans)) {
        const start = Math.min(s.start, text.length), end = Math.min(s.end, text.length);
        if (start > pos) segments.push({ text: text.substring(pos, start), start: pos, style: {} });
        if (end > start) segments.push({ text: text.substring(start, end), start, style: styleOf(s) });
        pos = Math.max(pos, end);
    }
    if (pos < text.length) segments.push({ text: text.substring(pos), start: pos, style: {} });
    return segments;
}

/** Whether every character of [start, end) has the attribute on (bold/italic/underline) */
export function allHave(spans: TextSpan[] | undefined, start: number, end: number, key: "bold" | "italic" | "underline",
    base: boolean): boolean {
    for (let i = start; i < end; i++) {
        const v = styleAt(spans, i)[key];
        if (!(v ?? base)) return false;
    }
    return end > start;
}

/** Sizes set on ranges, scaled with the text's own size (e.g. when the whole box gets bigger) */
export function scaleSpanSizes(spans: TextSpan[] | undefined, factor: number): TextSpan[] | undefined {
    if (!spans?.length || factor === 1) return spans;
    return spans.map(s => s.fontSize !== undefined ? { ...s, fontSize: s.fontSize * factor } : s);
}
