# Shengpu

Practice Mandarin Chinese tones with real-time pitch visualization. Record yourself speaking, see your tone contours on a spectrogram, and compare side-by-side with reference audio.

## Features

- **Reference spectrograms** for all Mandarin syllables and common tone combinations, with male and female voice presets
- **Live microphone recording** with real-time spectrogram generation
- **Side-by-side comparison** — reference audio on top, your voice on the bottom
- **Upload audio files** to use as a custom reference
- **Save snapshots** as shareable PNG images with branding
- **Adjustable visualization** — brightness, contrast, zoom, and frequency range controls
- **Frequency grid overlay** with Hz labels for precise pitch reading

## Development

Install dependencies:

```
pnpm install
```

Start the dev server:

```
pnpm start
```

Build for production:

```
pnpm run build
```

Type check:

```
pnpm run type-check
```

## Tech

- WebGL spectrogram rendering with custom fragment shader
- Web Audio API for microphone input and audio playback
- React 18 with shadcn/ui components (Radix primitives + Tailwind CSS)
- Webpack 4 with worker-loader for off-thread FFT processing

## License

MIT
