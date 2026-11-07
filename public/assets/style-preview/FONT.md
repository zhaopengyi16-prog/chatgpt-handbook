# Silkscreen — administrator style-preview font

Verified: 2026-11-07 (UTC). This directory distributes `silkscreen-latin.woff2`, `OFL.txt`, and this provenance note. The file contains only ASCII letters and digits.

## Final asset

- File: `silkscreen-latin.woff2`
- Weight/style: 400 / normal; no synthetic bold.
- Size: **4,116 bytes (4.02 KiB)**.
- SHA-256: `99d31a1872047fe5adbe81bc414aa07d3024ce568a3e04fad613ecb72a8c4d64`.
- Offline subset: exactly `U+0030-0039, U+0041-005A, U+0061-007A` (62 cmap characters, 63 glyphs including `.notdef`).
- Created with preinstalled fontTools 4.61.1 from the pinned official TTF below. WOFF2 compression/decompression used preinstalled system `libbrotlienc.so.1` / `libbrotlidec.so.1` through a memory-only Python adapter. No new application or build dependency was installed.
- Only subsetting/compression was performed; all name metadata and source timestamp were retained. All 62 glyph outlines, contour flags, and horizontal advance metrics were compared with the source and match. A repeat build reproduced the SHA-256 above.

## Immutable source and licence

Google Fonts distribution commit that last changed both the font and its licence:

`7e8d490955e9d2629cd3095e8dadd6fafe3c16b8` (2022-07-01; “Silkscreen: Version 1.001; ttfautohint (v1.8.4.7-5d5b) added (#4828)”).

- Source: <https://raw.githubusercontent.com/google/fonts/7e8d490955e9d2629cd3095e8dadd6fafe3c16b8/ofl/silkscreen/Silkscreen-Regular.ttf>
- Source bytes: 32,220; SHA-256: `c845473330b94c2079ce9af01c51ac8ba2d99c24f4d14c039843bbb8e642ebd8`.
- Licence: <https://raw.githubusercontent.com/google/fonts/7e8d490955e9d2629cd3095e8dadd6fafe3c16b8/ofl/silkscreen/OFL.txt>
- Licence bytes: 4,394; SHA-256: `86c5e9c9382cdcc5948704fdfe60f2aa164a719746931219a42736ecd9cefbd3`.
- Commit: <https://github.com/google/fonts/commit/7e8d490955e9d2629cd3095e8dadd6fafe3c16b8>
- Upstream author project: <https://github.com/googlefonts/silkscreen>, inspected commit `54c2494a1d4daafb2e1d6fd0df0286e7ca17891f`.

The newest commit for the distribution directory was `8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5` (2026-03-12, added an upstream investigation document). The font and licence at that directory revision are byte-for-byte equal to the immutable 2022 font/licence source above; both were independently downloaded and hashed. The 2026 commit did not update the font binary.

`OFL.txt` is the complete unmodified SIL Open Font License 1.1 and must be shipped with the font. Its copyright line is “Copyright 2001 The Silkscreen Project Authors (https://github.com/googlefonts/silkscreen)”. It declares no Reserved Font Name. OFL permits modification/subsetting and redistribution under its conditions; this derived font remains OFL 1.1, separate from the site's code licence. The copyright, licence text and embedded name metadata are retained. No licence is inferred merely from a font-service URL.

## Parsed font metadata

Actual final WOFF2 parsed with fontTools:

| Field | Value |
| --- | --- |
| name ID 0 | Copyright 2001 The Silkscreen Project Authors (https://github.com/googlefonts/silkscreen) |
| name ID 1 / 2 | Silkscreen / Regular |
| name ID 3 | 1.001;UNKN;Silkscreen-Regular |
| name ID 4 / 6 | Silkscreen Regular / Silkscreen-Regular |
| name ID 5 | Version 1.001; ttfautohint (v1.8.4.7-5d5b) |
| name ID 13 | Embedded SIL Open Font License 1.1 notice retained |
| name ID 14 | https://scripts.sil.org/OFL |
| OS/2 weight | 400 |
| head fontRevision | 1.001007080078125 |
| cmap | Exactly 62 ASCII letters/digits; no Chinese |

The pinned source has 226 mapped characters. The separately delivered QA bundle includes `font-evidence/ascii-font-metadata.json` and `font-evidence/font-source-comparison.json`, which record the decoded fields.

## Official Google Fonts WOFF2 cross-check

The initially downloaded, unmodified official Latin subset was 8,404 bytes (8.21 KiB), SHA-256 `e6c72ea4702249202bcdd79d3343057e4e25ef1f04e3fcffd8602ab53b40b4cc`:

- CSS: <https://fonts.googleapis.com/css2?family=Silkscreen:wght@400&display=swap> (modern Chrome user agent).
- Binary: <https://fonts.gstatic.com/s/silkscreen/v6/m8JXjfVPf62XiF7kO-i9YLNlaw.woff2>.

Its actual metadata matches the pinned TTF for copyright, family, style, unique ID, full/PostScript name, version, licence URL, fontRevision and weight. It has 215 mapped characters, all covered by the pinned TTF. Its licence name ID 13 is omitted by Google's web subset. These checks establish matching published metadata and charset ancestry; they do not prove a byte-identical build or Google's internal build provenance. The final 4,116-byte asset is derived directly from the pinned TTF, not from that web subset, so the derivative source is exact and the embedded licence notice is retained.

## Integration

Apply the font only to explicit English/number heading spans on the administrator preview route. Chinese headings/navigation and every article body remain in system fonts. The CSS range is a second guard; the file itself is already reduced to those 62 characters. Numbers inside article prose must not inherit this face.

```css
@font-face {
  font-family: 'Handbook Silkscreen';
  src: url('/assets/style-preview/silkscreen-latin.woff2') format('woff2');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0030-0039, U+0041-005A, U+0061-007A;
}
.style-preview[data-theme="pixel"] .sp-pixel {
  font-family: 'Handbook Silkscreen', system-ui, sans-serif;
  font-weight: 400;
  font-synthesis: none;
}
```

Do not preload the font in the root layout or import preview CSS there. The local face should load only on the preview route; `font-display: swap` keeps text readable. No runtime Google Fonts requests are required after self-hosting. The font contains no game artwork and no third-party game name, logo, character or texture is used.
