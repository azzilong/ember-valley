// Ember Valley — a spot-the-difference game for the make.fun bounty.
// Three mountain-village seasons (a dawn village, an autumn camp, a snowy
// lantern night), seven differences hidden in each scene. The game itself is
// plain static files under game/ (index.html plus ES modules, no library and
// no network request); this entrypoint only hands it in. It copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json,
// the summary the judge reads, using the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8081.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The dossier caps mirror the bounty gates: at most four screenshots, each no
// larger than 256 KiB; the game stays under 993 files and 48 MiB, with no path
// longer than 1000 bytes. Only text_max_bytes shapes the dossier bytes; the
// other caps refuse an entry the scorer would refuse.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
