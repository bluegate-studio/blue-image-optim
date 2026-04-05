[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A5%201.1-f9f1e1?logo=bun)](https://bun.sh/)
[![Sharp](https://img.shields.io/badge/Sharp-libvips-99cc00?logo=sharp)](https://sharp.pixelplumbing.com/)

# 🔷 blue-image-optim

CLI tool that recursively scans a directory, resizes images to a bounding box, and compresses them in-place using [Sharp](https://sharp.pixelplumbing.com/). Tracks processed files in SQLite so re-runs skip what's already done.

Built for batch-optimizing large image libraries — tested against 40,000+ files.

## Features

- 📂 **Recursive scanning** — finds images in all subdirectories via glob patterns
- 🖼️ **Format-aware compression** — mozjpeg for JPEG, palette mode for PNG, optimized WebP/GIF/TIFF
- 🔒 **No format conversion** — images stay in their original format
- 📏 **No upscaling** — small images remain untouched (`withoutEnlargement`)
- ⚖️ **Overwrite only when smaller** — if the optimized file is larger, the original is preserved
- 🎞️ **Animated GIF detection** — animated GIFs are automatically skipped
- 🗄️ **SQLite tracking** — remembers what's been processed, making re-runs near-instant
- ⚡ **Parallel processing** — configurable concurrency (defaults to CPU core count)
- 📊 **Progress bar** — live progress with ETA

## Supported Formats

| Format | Encoder | Notes |
|--------|---------|-------|
| jpg / jpeg | mozjpeg | Superior compression vs. standard libjpeg |
| png | libvips palette | Lossy palette mode, max compression level |
| webp | libwebp | Effort level 6 |
| gif | libvips | Static only — animated GIFs are skipped |
| tif / tiff | libjpeg in TIFF | JPEG compression within TIFF container |

> **Note:** BMP files are excluded — there's no meaningful way to optimize them without converting to another format.

## Requirements

- [Bun](https://bun.sh/) ≥ 1.1

That's it. Sharp ships its own prebuilt libvips binaries — no system dependencies needed.

## Install

```bash
git clone https://github.com/bluegate-studio/blue-image-optim.git
cd blue-image-optim
bun install
```

## Usage

```bash
bun _.js --dir /path/to/images
```

With options:

```bash
bun _.js --dir /path/to/images --max-size 1920 --quality 80 --concurrency 4
```

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dir` | string | — | Directory to scan (**required**) |
| `--max-size` | int | `1920` | Max width/height in pixels — images larger than this are resized to fit within this bounding box |
| `--quality` | int | `80` | Compression quality (1–100) |
| `--concurrency` | int | CPU cores | Number of images processed in parallel |
| `--help` | — | — | Show help message |

### Examples

Optimize a website's upload directory at default settings:

```bash
bun _.js --dir /var/www/mysite/uploads
```

Aggressive compression for thumbnails:

```bash
bun _.js --dir ./thumbnails --max-size 400 --quality 60
```

Full-resolution archival with light compression:

```bash
bun _.js --dir /mnt/photos --max-size 4096 --quality 95
```

## How Tracking Works

On the first run, a SQLite database (`optim.db`) is created alongside the tool. Each processed image is recorded with its **file path**, **file size**, and **modification time**.

On subsequent runs, the tool checks each discovered file against this database. If the path, size, and mtime all match a previous record, the file is skipped — no I/O, no re-encoding. This makes re-runs over large directories nearly instant.

If a file is modified externally (different size or mtime), it will be re-processed on the next run.

The database is local and gitignored. Delete `optim.db` at any time to force a full re-scan.

## Acknowledgements

This tool stands on the shoulders of some outstanding open-source projects:

- **[Sharp](https://sharp.pixelplumbing.com/)** and **[libvips](https://www.libvips.org/)** — the fast, battle-tested image processing library at the heart of everything this tool does. Thank you to [Lovell Fuller](https://github.com/lovell) and the libvips contributors.
- **[Bun](https://bun.sh/)** — the runtime that makes this possible with built-in SQLite, native glob scanning, and blazing-fast I/O. Thank you to [Jarred Sumner](https://github.com/Jarred-Sumner) and the Oven team.
- **[Chalk](https://github.com/chalk/chalk)** — for making terminal output beautiful. Thank you to [Sindre Sorhus](https://github.com/sindresorhus).

This project is a ground-up rewrite of an internal PHP tool that served us reliably for a decade. The architecture — scan, track, optimize, skip-if-larger — was shaped by years of running batch jobs over tens of thousands of production images. The new version is faster and self-contained, but the blueprint came first.

## License

[MIT](LICENSE) — © 2026 Bluegate Studio
