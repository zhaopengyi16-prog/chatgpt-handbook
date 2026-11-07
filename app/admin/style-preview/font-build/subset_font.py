#!/usr/bin/env python3
"""One-off, offline OFL font sharding. Never imported by the website.

Needs Python 3 and fontTools with WOFF2 support. If the Python Brotli module is
absent, an installed system libbrotli can provide compression via ctypes.
The source release archive is supplied explicitly and verified before reading.
"""
from __future__ import annotations

import argparse
import ctypes
import ctypes.util
import hashlib
import io
import json
from pathlib import Path
import sys
import types
import zipfile

RELEASE = "2026.10.25"
COMMIT = "3266d59c25c3fa8f8b5e163b29736a706fd9ab6f"
ARCHIVE_NAME = "fusion-pixel-font-12px-proportional-ttf.woff2-v2026.10.25.zip"
ARCHIVE_URL = f"https://github.com/TakWolf/fusion-pixel-font/releases/download/{RELEASE}/{ARCHIVE_NAME}"
ARCHIVE_SHA256 = "5624e6a1e5c448500771480c3080df0e0748c410e0838dc9ae085c49c21bf25e"
SOURCE_NAME = "fusion-pixel-12px-proportional-zh_hans.ttf.woff2"
SOURCE_SHA256 = "7cdaf516e63dbcb7b190b3d0606bdd5d451ef51593d6d3d934d30ba086e88b6d"
PUBLIC_BASE = "/assets/style-preview/miaomiao-font"
SPAN = 2048


def brotli_support() -> None:
    try:
        import brotli  # noqa: F401
        return
    except ImportError:
        pass
    try:
        import brotlicffi  # noqa: F401
        return
    except ImportError:
        pass
    decoder_name = ctypes.util.find_library("brotlidec")
    encoder_name = ctypes.util.find_library("brotlienc")
    if not decoder_name or not encoder_name:
        raise RuntimeError("Install fontTools[woff] in a separate offline tooling environment; no website dependency is required.")
    decoder = ctypes.CDLL(decoder_name)
    encoder = ctypes.CDLL(encoder_name)
    decoder.BrotliDecoderDecompress.argtypes = [ctypes.c_size_t, ctypes.c_void_p, ctypes.POINTER(ctypes.c_size_t), ctypes.c_void_p]
    decoder.BrotliDecoderDecompress.restype = ctypes.c_int
    encoder.BrotliEncoderMaxCompressedSize.argtypes = [ctypes.c_size_t]
    encoder.BrotliEncoderMaxCompressedSize.restype = ctypes.c_size_t
    encoder.BrotliEncoderCompress.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_size_t, ctypes.c_void_p, ctypes.POINTER(ctypes.c_size_t), ctypes.c_void_p]
    encoder.BrotliEncoderCompress.restype = ctypes.c_int

    def decompress(data: bytes) -> bytes:
        source = ctypes.create_string_buffer(data)
        size = ctypes.c_size_t(64 * 1024 * 1024)
        output = ctypes.create_string_buffer(size.value)
        if decoder.BrotliDecoderDecompress(len(data), source, ctypes.byref(size), output) != 1:
            raise ValueError("Brotli decompression failed or exceeded the 64 MiB tooling limit")
        return output.raw[:size.value]

    def compress(data: bytes, mode: int = 0) -> bytes:
        source = ctypes.create_string_buffer(data)
        size = ctypes.c_size_t(encoder.BrotliEncoderMaxCompressedSize(len(data)))
        output = ctypes.create_string_buffer(size.value)
        if encoder.BrotliEncoderCompress(11, 22, mode, len(data), source, ctypes.byref(size), output) != 1:
            raise ValueError("Brotli compression failed")
        return output.raw[:size.value]

    module = types.ModuleType("brotli")
    module.decompress, module.compress = decompress, compress
    module.MODE_FONT, module.MODE_TEXT = 2, 1
    sys.modules["brotli"] = module


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def ranges(codes: set[int]) -> str:
    """Exact, disjoint character ranges; never include another shard's glyphs."""
    groups = []
    for code in sorted(codes):
        if groups and code == groups[-1][1] + 1:
            groups[-1][1] = code
        else:
            groups.append([code, code])
    return ",".join(f"U+{a:04X}" + (f"-{b:04X}" if a != b else "") for a, b in groups)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--archive", type=Path, required=True, help="Pinned official release ZIP; never committed to the website")
    parser.add_argument("--output", type=Path, required=True, help="Destination for generated WOFF2, CSS and licence files")
    parser.add_argument("--hot", type=Path, default=Path(__file__).with_name("hot-chars.txt"))
    args = parser.parse_args()
    archive_bytes = args.archive.read_bytes()
    if digest(archive_bytes) != ARCHIVE_SHA256:
        raise ValueError("Unexpected release archive SHA-256; refusing to build")
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as archive:
        source_bytes = archive.read(SOURCE_NAME)
        if digest(source_bytes) != SOURCE_SHA256:
            raise ValueError("Unexpected source font SHA-256; refusing to build")
        licence_paths = ["OFL.txt", "LICENSES/ark-pixel/OFL.txt", "LICENSES/cubic-11/OFL.txt", "LICENSES/galmuri/LICENSE.txt"]
        licences = {name: archive.read(name) for name in licence_paths}
    brotli_support()
    import fontTools
    from fontTools import subset
    from fontTools.ttLib import TTFont

    original = TTFont(io.BytesIO(source_bytes), recalcTimestamp=False)
    all_codes = set(original.getBestCmap())
    # Decode WOFF2's transformed glyph tables once. Re-reading the WOFF2 for
    # every shard repeats expensive Python reconstruction of all 37k glyphs.
    # The intermediate SFNT exists only in memory, never in the repository.
    original.flavor = None
    intermediate = io.BytesIO()
    original.save(intermediate)
    sfnt_bytes = intermediate.getvalue()
    hot_text = args.hot.read_text(encoding="utf-8")
    ascii_codes = all_codes & set(range(0x20, 0x7F))
    hot_codes = (set(map(ord, hot_text)) & all_codes) - ascii_codes
    missing_hot = sorted(set(map(ord, hot_text)) - all_codes - {10, 13, 9})
    if missing_hot:
        raise ValueError(f"Requested hot glyphs absent from upstream source: {ranges(set(missing_hot))}")
    remainder = all_codes - ascii_codes - hot_codes
    groups = [("ascii", ascii_codes), ("home", hot_codes)]
    for bucket in sorted({code // SPAN for code in remainder}):
        codes = {code for code in remainder if code // SPAN == bucket}
        groups.append((f"u{bucket * SPAN:05x}", codes))
    assert sum(len(codes) for _, codes in groups) == len(all_codes)
    assert set().union(*(codes for _, codes in groups)) == all_codes

    args.output.mkdir(parents=True, exist_ok=True)
    for path, data in licences.items():
        target = args.output / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    records, css, seen = [], [], set()
    options = subset.Options()
    options.name_IDs, options.name_languages, options.name_legacy = ["*"], ["*"], True
    options.recalc_timestamp = False
    options.layout_features = ["*"]
    # Each shard has a derivative family name. Source copyright and OFL metadata remain.
    replacement_names = {1: "Miaomiao Pixel", 2: "Regular", 3: f"{RELEASE};MiaomiaoPixel-Regular", 4: "Miaomiao Pixel Regular", 6: "MiaomiaoPixel-Regular", 16: "Miaomiao Pixel", 17: "Regular"}
    for label, codes in groups:
        font = TTFont(io.BytesIO(sfnt_bytes), recalcTimestamp=False)
        for name in font["name"].names:
            if name.nameID in replacement_names:
                name.string = replacement_names[name.nameID].encode(name.getEncoding())
        worker = subset.Subsetter(options=options)
        worker.populate(unicodes=codes)
        worker.subset(font)
        font.flavor = "woff2"
        filename = f"miaomiao-{label}.woff2"
        target = args.output / filename
        font.save(target)
        checked = TTFont(target, recalcTimestamp=False)
        actual = set(checked.getBestCmap())
        assert actual == codes and not seen.intersection(actual)
        assert checked["name"].getDebugName(0) == original["name"].getDebugName(0)
        assert checked["name"].getDebugName(13) == original["name"].getDebugName(13)
        seen.update(actual)
        content = target.read_bytes()
        row = {"file": filename, "bytes": len(content), "sha256": digest(content), "characters": len(codes), "unicodeRange": ranges(codes)}
        records.append(row)
        css.append(f"/* {filename}: {len(codes)} mapped characters, {len(content)} bytes */\n@font-face {{\n  font-family: 'Miaomiao Pixel';\n  font-style: normal;\n  font-weight: 400;\n  font-display: swap;\n  src: url('{PUBLIC_BASE}/{filename}') format('woff2');\n  unicode-range: {row['unicodeRange']};\n}}\n")
        print(f"{filename}: {len(codes)} characters, {len(content)} bytes", flush=True)
    assert seen == all_codes
    gb2312_han = {ord(bytes((a, b)).decode("gb2312")) for a in range(0xB0, 0xF8) for b in range(0xA1, 0xFF) if not (a == 0xD7 and b >= 0xFA)}
    manifest = {
        "family": "Miaomiao Pixel", "upstreamFamily": original["name"].getDebugName(1),
        "release": RELEASE, "commit": COMMIT, "archiveUrl": ARCHIVE_URL, "archiveSHA256": ARCHIVE_SHA256,
        "sourceFile": SOURCE_NAME, "sourceBytes": len(source_bytes), "sourceSHA256": SOURCE_SHA256,
        "fontTools": fontTools.version, "bucketSpan": SPAN, "hotTextSHA256": digest(args.hot.read_bytes()),
        "sourceMappedCharacters": len(all_codes), "preservedMappedCharacters": len(seen),
        "cjkUnifiedCharacters": sum(0x4E00 <= c <= 0x9FFF for c in all_codes),
        "gb2312HanCharacters": len(gb2312_han), "gb2312HanCovered": len(gb2312_han & all_codes),
        "gb2312HanMissing": ranges(gb2312_han - all_codes),
        "totalWoff2Bytes": sum(r["bytes"] for r in records), "homeAndAsciiBytes": sum(r["bytes"] for r in records[:2]),
        "maxShardBytes": max(r["bytes"] for r in records), "shardCount": len(records),
        "licences": [{"path": n, "sha256": digest(b)} for n, b in licences.items()], "shards": records,
    }
    (args.output / "fonts.css").write_text("/* Generated by subset_font.py. Import only from the administrator style preview. */\n" + "\n".join(css), encoding="utf-8")
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.output / "coverage.txt").write_text(ranges(all_codes) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in manifest.items() if k not in {"shards", "licences"}}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
