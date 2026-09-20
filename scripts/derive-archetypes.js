#!/usr/bin/env node
/**
 * Legerly — derive the break-even archetypes from a measured tokenizer.
 *
 * WHY THIS EXISTS
 * `plan-limits.json._meta.archetypes` sets tokens per message exchange, and its own
 * comment has admitted since it was written that the numbers are "round numbers
 * chosen to be legible, not derived from data" while being "the largest single lever
 * on every figure on the page". Every break-even the site prints rests on them.
 *
 * WHAT CHANGED, AND WHAT DID NOT
 * This does NOT turn the archetypes into measurements. There is no corpus of real
 * chat traffic in this repo, and inventing one would be worse than the gap. What it
 * does is split the assumption into two halves and measure the half that can be
 * measured:
 *
 *   1. HOW LONG A MESSAGE IS — still an assumption, but now stated in CHARACTERS,
 *      which a person can actually judge. "A typical assistant reply is about 1,800
 *      characters" is a claim you can check by looking at one. "500 output tokens"
 *      is not.
 *   2. HOW MANY TOKENS THAT IS — measured here, with the real cl100k tokenizer, over
 *      this repo's own prose. No folk 4-chars-per-token constant.
 *
 * So the remaining assumption is legible and the conversion is real. That is the
 * honest version of "derived", and the JSON says so in the same words.
 *
 * Prose only, deliberately: chat is prose. The calibration corpus also carries code
 * and URL-dense text, which tokenize very differently (see calibrate-tokenizer.js),
 * and blending them in would move the ratio towards content a chat message is not.
 *
 * Run:        node scripts/derive-archetypes.js          (report only)
 *             node scripts/derive-archetypes.js --write  (update plan-limits.json)
 * check-auditor.js runs the derivation and fails if the JSON has drifted from it.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// Real tokenizer, same one calibrate-tokenizer.js treats as ground truth.
eval(fs.readFileSync(path.join(ROOT, 'extension/tokenizer_cl100k.js'), 'utf8'));
const tokens = t => cl100k.encode(t).length;

// ── the measured half: characters per token, over this repo's prose ──
// Line endings are normalised before anything is counted. Without this the measured
// ratio depends on the CHECKOUT: a Windows working copy has CRLF, a Linux CI runner
// has LF, and every stray \r is a character and sometimes a token. The first CI run
// of this script disagreed with my machine — 3.882 vs 3.911 chars/token — and a
// "measured" constant that changes with the platform it was measured on is not one.
const read = p => {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\r\n/g, '\n'); }
  catch { return ''; }
};
function chunk(text, size) {
  const out = [];
  for (let i = 0; i < text.length; i += size) {
    const s = text.slice(i, i + size).trim();
    if (s.length > 200) out.push(s);
  }
  return out;
}
const prose = [
  ...chunk(read('PROJECT-CONTEXT.md').replace(/```[\s\S]*?```/g, ''), 1200),
  ...chunk(read('CLAUDE.md'), 1200),
  ...chunk(read('README.md'), 1200),
  ...chunk(read('FRESHNESS.md').replace(/```[\s\S]*?```/g, ''), 1200),
];
let chars = 0, toks = 0;
for (const s of prose) { chars += s.length; toks += tokens(s); }
const CHARS_PER_TOKEN = chars / toks;

// ── the assumed half: message lengths, in characters, and how much history rides along ──
// Stated so a human can check them against a real chat window. `history_turns` is the
// number of PRIOR exchanges re-sent with each new message — the thing that makes chat
// input grow super-linearly and the reason input dwarfs output in every archetype.
const SHAPES = {
  light:    { prompt_chars:  220, reply_chars:  900, history_turns: 2,
              label: 'Short exchanges, little history' },
  standard: { prompt_chars:  450, reply_chars: 1800, history_turns: 6,
              label: 'Typical multi-turn chat' },
  heavy:    { prompt_chars: 1400, reply_chars: 4200, history_turns: 10,
              label: 'Long context, documents, code' },
};

// input  = this prompt + every prior turn (prompt + reply) re-sent
// output = this reply
function derive(s) {
  const promptTok = Math.round(s.prompt_chars / CHARS_PER_TOKEN);
  const replyTok  = Math.round(s.reply_chars  / CHARS_PER_TOKEN);
  return {
    input:  Math.round(promptTok + s.history_turns * (promptTok + replyTok)),
    output: replyTok,
  };
}

const archetypes = { };
for (const [name, s] of Object.entries(SHAPES)) {
  const d = derive(s);
  archetypes[name] = {
    input: d.input, output: d.output, label: s.label,
    prompt_chars: s.prompt_chars, reply_chars: s.reply_chars, history_turns: s.history_turns,
  };
}

const COMMENT =
  'Tokens per message exchange. DERIVED, not hand-picked: scripts/derive-archetypes.js ' +
  'measures characters-per-token with the real cl100k tokenizer over this repo’s prose ' +
  '(' + CHARS_PER_TOKEN.toFixed(3) + ' chars/token, ' + prose.length + ' samples) and converts the message ' +
  'lengths below. Read that honestly: the CONVERSION is measured, the LENGTHS are still ' +
  'an assumption — prompt_chars, reply_chars and history_turns are judgement, chosen to be ' +
  'checkable against a real chat window rather than legible as round token counts. ' +
  '“input” is this prompt plus history_turns prior exchanges re-sent; “output” is the reply, ' +
  'BEFORE the reasoning multiplier in _meta.reasoning is applied. This is still the largest ' +
  'single lever on every figure on the page. There is no corpus of real chat traffic here, ' +
  'so do not call these measurements; the intended anchor remains real EcoMeter exports. ' +
  'check-auditor.js re-runs the derivation and fails if this block has drifted from it.';

// Surgical rewrite of just this block. JSON.stringify on the whole file would reflow
// every row in plan-limits.json and bury a six-line change in a 300-line diff.
function renderBlock(NL) {
  const q = s => JSON.stringify(s);
  const rows = Object.entries(archetypes).map(([name, a]) =>
    '      ' + q(name) + ': { "input": ' + a.input + ', "output": ' + a.output +
    ', "prompt_chars": ' + a.prompt_chars + ', "reply_chars": ' + a.reply_chars +
    ', "history_turns": ' + a.history_turns + ', "label": ' + q(a.label) + ' }');
  return ['    "archetypes": {', '      "comment": ' + q(COMMENT) + ',',
          rows.join(',' + NL), '    },'].join(NL);
}
module.exports.renderBlock = renderBlock;

if (process.argv.includes('--write')) {
  const P = path.join(ROOT, 'plan-limits.json');
  const raw = fs.readFileSync(P, 'utf8');
  const NL = raw.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
  const start = raw.indexOf('    "archetypes": {');
  // The closing brace must be matched at its OWN indentation, anchored to a line
  // start. Searching for '    },' alone finds it inside '      },' — the nested
  // "light" object\'s close — the six-space string contains the four-space one.
  // The splice then cut the block mid-object and the JSON.parse below threw, so
  // --write has been dead since the archetypes gained nested rows, while
  // check-auditor.js went on naming it as the remedy. Found 2026-09-19.
  const CLOSE = NL + '    },';
  const end = raw.indexOf(CLOSE, start);
  if (start < 0 || end < 0) throw new Error('cannot locate the archetypes block in plan-limits.json');
  const out = raw.slice(0, start) + renderBlock(NL) + raw.slice(end + CLOSE.length);
  JSON.parse(out);
  fs.writeFileSync(P, out);
  console.log('plan-limits.json archetypes updated.');

  // pricing.html mirrors BOTH of these so the table renders before the live fetch
  // lands, and check-auditor.js checks both copies. Until 2026-09-19 --write wrote
  // only plan-limits.json, so the documented remedy for a drift failure did not
  // clear that failure — you ran the script the error names and still had two. The
  // block there even read "Owned by scripts/derive-archetypes.js" while nothing
  // here wrote it.
  const H = path.join(ROOT, 'pricing.html');
  let html = fs.readFileSync(H, 'utf8');
  const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
  const HNL = html.indexOf(CR + LF) >= 0 ? CR + LF : LF;
  const before = html;

  html = html.replace(/var CHARS_PER_TOKEN = [\d.]+;/,
    'var CHARS_PER_TOKEN = ' + CHARS_PER_TOKEN.toFixed(3) + ';');

  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  const mirror = Object.entries(archetypes).map(([name, a]) =>
    '        ' + pad(name + ':', 10) + ' { input: ' + pad(a.input + ',', 6) +
    ' output: ' + pad(a.output + ',', 5) + ' label: ' + JSON.stringify(a.label) + ' }');
  const TAG = '        // Owned by scripts/derive-archetypes.js — regenerate, don\'t hand-edit.';
  const s2 = html.indexOf(TAG);
  if (s2 < 0) throw new Error('cannot locate the archetypes mirror in pricing.html');
  const e2 = html.indexOf(HNL + '      },', s2);
  if (e2 < 0) throw new Error('cannot locate the end of the archetypes mirror');
  html = html.slice(0, s2) + TAG + HNL + mirror.join(',' + HNL) + html.slice(e2);

  if (html !== before) {
    fs.writeFileSync(H, html);
    console.log('pricing.html CHARS_PER_TOKEN and archetype mirror updated.');
  }

  // audit.html carries a THIRD copy as its failed-fetch fallback, and its comment
  // also claimed this script 'owns these numbers and regenerates them'. It did not.
  // FRESHNESS warns that audit.html is the copy updated last or not at all; the way
  // to stop that being true is for the generator to write it.
  const A = path.join(ROOT, 'audit.html');
  let aud = fs.readFileSync(A, 'utf8');
  const audBefore = aud;
  const one = ([n, a]) => n + ':{in:' + a.input + ',out:' + a.output + '}';
  aud = aud.replace(/const ARCHETYPE={[^}]*}[^;]*;/,
    'const ARCHETYPE={ ' + Object.entries(archetypes).map(one).join(', ') + ' };');
  if (aud !== audBefore) {
    fs.writeFileSync(A, aud);
    console.log('audit.html ARCHETYPE fallback updated.');
  }
}

module.exports = { CHARS_PER_TOKEN, archetypes, SHAPES, COMMENT, samples: prose.length };

if (require.main === module) {
  console.log('chars/token (cl100k, repo prose, ' + prose.length + ' samples): ' + CHARS_PER_TOKEN.toFixed(3));
  console.log('');
  console.log('archetype  prompt  reply  history   ->   input   output');
  for (const [name, a] of Object.entries(archetypes)) {
    console.log(
      name.padEnd(10) +
      String(a.prompt_chars).padStart(6) + String(a.reply_chars).padStart(7) +
      String(a.history_turns).padStart(9) + '   ->' +
      String(a.input).padStart(8) + String(a.output).padStart(9));
  }
}
