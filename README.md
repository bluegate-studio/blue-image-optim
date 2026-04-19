[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%E2%89%A5%201.1-f9f1e1?logo=bun)](https://bun.sh/)
[![Sharp](https://img.shields.io/badge/Sharp-libvips-99cc00?logo=sharp)](https://sharp.pixelplumbing.com/)

# 🔷 blue-image-optim

Batch image optimizer that recursively scans a directory, resizes images to a bounding box, and compresses them in-place using [Sharp](https://sharp.pixelplumbing.com/). Tracks processed files in SQLite so re-runs skip what's already done.

Works as a **standalone CLI tool** or as an **importable dependency** in your own Bun projects.

Built for batch-optimizing large archives of images — tested against many millions of files in 100k+ batches.

## Features

- 📂 **Recursive scanning** — finds images in all subdirectories using Bun.Glob, with automatic fallback to native `find` if the glob walker hits permission errors (e.g. `lost+found` directories on mounted volumes)
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

### As a standalone tool

```bash
git clone https://github.com/bluegate-studio/blue-image-optim.git
cd blue-image-optim
bun install
npm link
```

`npm link` registers the `blue-image-optim` command globally — you can now run it from anywhere.

### As a dependency in your project

```bash
bun add git+https://github.com/bluegate-studio/blue-image-optim.git
```

## Usage

### CLI

```bash
blue-image-optim --dir /path/to/images
```

With options:

```bash
blue-image-optim --dir /path/to/images --max-size 1920 --quality 80 --concurrency 4
```

### Options

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `--dir` | string | — | Directory to scan (**required**) |
| `--max-size` | int | `1920` | Max width/height in pixels — images larger than this are resized to fit within this bounding box |
| `--quality` | int | `80` | Compression quality (1–100) |
| `--concurrency` | int | CPU cores | Number of images processed in parallel |
| `--help` | — | — | Show help message |

### CLI Examples

Optimize a website's upload directory at default settings:

```bash
blue-image-optim --dir /var/www/mysite/uploads
```

Aggressive compression for thumbnails:

```bash
blue-image-optim --dir ./thumbnails --max-size 400 --quality 60
```

Full-resolution archival with light compression:

```bash
blue-image-optim --dir /mnt/photos --max-size 4096 --quality 95
```

### As a Library

Import and optimize a single image from your own code:

```js
import { optimize } from 'blue-image-optim';

let result = await optimize({ filepath: '/uploads/photo.jpg', max_size: 1920, quality: 80 });

if ( result.success && result.optimized ) {
    console.log( `Saved ${result.gain_pct}% — ${result.size_before} → ${result.size_after} bytes` );
}
```

The `optimize()` function handles everything — validates the file, detects the format, resizes, compresses, and overwrites only if the result is smaller. It never throws; errors are returned as `{ success: false, error: '...' }`.

For more control, lower-level exports are also available:

```js
import { scan_files, optimize_file, create_pool } from 'blue-image-optim';
```

| Export | Purpose |
|--------|---------|
| `optimize({ filepath, max_size, quality })` | High-level: validate, resize, compress — one call does it all |
| `scan_files( dir )` | Recursive file discovery (Glob with find fallback) |
| `optimize_file({ filepath, ext, size, config })` | Raw Sharp pipeline — caller provides metadata |
| `create_pool( limit )` | Promise-based concurrency limiter with `.add()` and `.drain()` |

## Using Sharp in a Bundled App

Sharp relies on native C++ addons (libvips) that can't be inlined into a JavaScript bundle. If your app uses `bun build` (or any bundler), tell it to leave Sharp alone:

```bash
bun build --entrypoints ./src/_.js --outdir ./dist --target bun --external sharp
```

The `--external sharp` flag keeps the `import` statement intact in the output. At runtime, Bun (and Node) resolve it through standard module lookup — walking up the directory tree from the executing file until it finds a `node_modules/sharp`:

```
your-project/
  node_modules/       ← sharp lives here (from bun install)
    sharp/
  src/
    _.js
  dist/
    _.js              ← bundled output runs here, finds sharp via ../node_modules/
```

**Deployment:** run `bun install` on the target machine so `node_modules/sharp` is present with the correct platform-specific binaries. That's it — no global installs, no special configuration.

## Quick Inline Optimisation

If you only need to optimise one image at a time (e.g. after a user upload), you don't need this package at all. Add `sharp` directly to your project and use it inline:

```bash
bun add sharp
```

```js
import sharp from 'sharp';

const buffer = await sharp( input_path )
    .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

await Bun.write( output_path, buffer );
```

Swap `.jpeg()` for `.png()`, `.webp()`, or `.gif()` depending on the format. See [Supported Formats](#supported-formats) for encoder options.

If your app is bundled, remember to add `--external sharp` to your build command — see [Using Sharp in a Bundled App](#using-sharp-in-a-bundled-app).

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
