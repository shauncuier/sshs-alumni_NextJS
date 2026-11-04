# Golden Jubilee promo video

Remotion project for the 60-second Golden Jubilee 2026 promo (Bangla voiceover,
English subtitles). It is separate from the Next.js site: the root `tsconfig.json`
and `eslint.config.mjs` exclude `video/`.

- Script and timings: `script.md`, `src/theme.ts` (scene starts and captions)
- Voiceover: `public/voiceover.mp3` (ElevenLabs eleven_v4, voice "Rakib")
- Images: copies of the site's `public/` assets

```bash
npm i
npm run dev                                                   # Remotion Studio
npx remotion render Jubilee16x9 out/jubilee-promo-16x9.mp4
npx remotion render Jubilee9x16 out/jubilee-promo-9x16.mp4
```
