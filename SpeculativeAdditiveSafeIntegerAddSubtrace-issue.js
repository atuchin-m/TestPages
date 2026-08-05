<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>V8 AdditiveSafeInteger feedback repro (crbug 539350801)</title>
<style>
  :root {
    --bg: #0f1419;
    --panel: #1a2332;
    --text: #e7ecf3;
    --muted: #9aa8bc;
    --ok: #3dd68c;
    --bad: #ff6b6b;
    --accent: #6cb6ff;
    --border: #2a384c;
    --mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
    --sans: "IBM Plex Sans", "Segoe UI", system-ui, sans-serif;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    font: 16px/1.5 var(--sans);
    color: var(--text);
    background:
      radial-gradient(1200px 600px at 10% -10%, #1e3a5f 0%, transparent 55%),
      radial-gradient(900px 500px at 100% 0%, #2a1f3d 0%, transparent 50%),
      var(--bg);
  }
  main {
    max-width: 46rem;
    margin: 0 auto;
    padding: 2.5rem 1.25rem 4rem;
  }
  h1 {
    font-size: 1.55rem;
    font-weight: 650;
    letter-spacing: -0.02em;
    margin: 0 0 0.5rem;
  }
  .lead { color: var(--muted); margin: 0 0 1.5rem; }
  a { color: var(--accent); }
  section {
    background: color-mix(in srgb, var(--panel) 92%, black);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.1rem 1.2rem;
    margin: 0 0 1rem;
  }
  h2 {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 0.65rem;
  }
  p { margin: 0 0 0.75rem; }
  p:last-child { margin-bottom: 0; }
  code, pre {
    font-family: var(--mono);
    font-size: 0.86em;
  }
  code {
    background: #0c1017;
    padding: 0.1em 0.35em;
    border-radius: 4px;
  }
  pre {
    margin: 0.75rem 0 0;
    padding: 0.85rem 1rem;
    background: #0c1017;
    border-radius: 8px;
    overflow-x: auto;
    white-space: pre-wrap;
    border: 1px solid var(--border);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    margin-top: 0.9rem;
  }
  button {
    appearance: none;
    border: 0;
    border-radius: 8px;
    padding: 0.65rem 1.1rem;
    font: 600 0.95rem var(--sans);
    background: var(--accent);
    color: #041018;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-weight: 700;
    font-size: 0.95rem;
    padding: 0.35rem 0.7rem;
    border-radius: 999px;
    border: 1px solid var(--border);
  }
  .badge.pass { color: var(--ok); background: color-mix(in srgb, var(--ok) 12%, transparent); }
  .badge.fail { color: var(--bad); background: color-mix(in srgb, var(--bad) 14%, transparent); }
  .badge.idle { color: var(--muted); }
  .meta {
    font-family: var(--mono);
    font-size: 0.82rem;
    color: var(--muted);
  }
  ul { margin: 0.4rem 0 0; padding-left: 1.2rem; color: var(--muted); }
  li { margin: 0.25rem 0; }
</style>
</head>
<body>
<main>
  <h1>AdditiveSafeInteger feedback correctness repro</h1>
  <p class="lead">
    Browser demo of
    <a href="https://issues.chromium.org/issues/539350801">crbug/539350801</a>
    — TurboFan + <code>--additive-safe-int-feedback</code> can disagree with JS
    <code>Number</code> semantics on long add chains. Follow-up:
    <a href="https://issues.chromium.org/issues/542403050">542403050</a>.
  </p>

  <section>
    <h2>Result</h2>
    <div class="row">
      <button id="run" type="button">Run repro</button>
      <span id="status" class="badge idle">Not run</span>
    </div>
    <pre id="log">Click “Run repro”. The page warms a 20-add chain until the optimizing compiler is likely active, then compares a bad input against correct JS rounding.</pre>
  </section>

  <section>
    <h2>What this checks</h2>
    <p>
      Warm-up uses pairwise cancelling values so every operand (and observed
      intermediate) stays inside AdditiveSafeInteger feedback. TurboFan may then
      lower the chain to wrapping <code>Int32</code> adds that only check leaf
      operands — not intermediates.
    </p>
    <p>
      The attack input keeps each leaf in range, but the running sum of the first
      ten positives crosses <code>2<sup>53</sup></code> and must round in real JS.
      Exact Word32 chaining does not round the same way, so
      <code>(…)|0</code> can diverge.
    </p>
  </section>

  <section>
    <h2>How to force the buggy configuration</h2>
    <p>Need a build where TurboFan still consumes AdditiveSafeInteger feedback:</p>
    <ul>
      <li>Launch Chrome/Brave with<br>
        <code>--js-flags=--additive-safe-int-feedback,--turbofan,--no-maglev,--no-turbolev</code>
      </li>
      <li>Or an older revision before
        <a href="https://chromium-review.googlesource.com/c/v8/v8/+/8174345">v8/v8@8174345</a>
        (flag defaulted on for TF).
      </li>
      <li>Upstream “Turbolev only” re-enable keeps
        <code>turbofan_additive_safe_int_feedback</code> off — expect <strong>PASS</strong> there.
      </li>
    </ul>
  </section>

  <section>
    <h2>UA</h2>
    <p class="meta" id="ua"></p>
  </section>
</main>
<script>
(() => {
  const MAX_FEEDBACK = 2 ** 50 - 1; // 1125899906842623
  const WARMUP_ITERS = 200_000;

  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const runBtn = document.getElementById('run');
  document.getElementById('ua').textContent = navigator.userAgent;

  function makeChain(tag) {
    const params = Array.from({ length: 20 }, (_, i) => 'p' + i);
    // Distinct source text => distinct SharedFunctionInfo.
    const body = 'return ((' + params.join(') + (') + ')) | 0; //' + tag;
    return new Function(...params, body);
  }

  function expectedFromArgs(args) {
    // Cold path: one-shot Number semantics (never warmed as a hot chain).
    let s = 0;
    for (const v of args) s += v;
    return s | 0;
  }

  function setStatus(kind, text) {
    statusEl.className = 'badge ' + kind;
    statusEl.textContent = text;
  }

  function log(lines) {
    logEl.textContent = lines.join('\n');
  }

  async function run() {
    runBtn.disabled = true;
    setStatus('idle', 'Running…');
    log(['Warming up optimizing compiler (' + WARMUP_ITERS.toLocaleString() + ' calls)…']);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

    const optimized = makeChain('opt-' + Math.random().toString(36).slice(2));

    const warmup = Array.from({ length: 20 }, (_, i) =>
      i % 2 ? -MAX_FEEDBACK : MAX_FEEDBACK);

    const t0 = performance.now();
    for (let i = 0; i < WARMUP_ITERS; i++) optimized(...warmup);
    // One more burst after a yield — helps some pipelines settle.
    await new Promise((r) => setTimeout(r, 0));
    for (let i = 0; i < 50_000; i++) optimized(...warmup);
    const warmMs = (performance.now() - t0).toFixed(1);

    const x = MAX_FEEDBACK - 4;
    const args = [
      ...Array(10).fill(x),
      ...Array(10).fill(-x),
    ];

    const expected = expectedFromArgs(args);
    const got = optimized(...args);
    const pass = Object.is(expected, got);

    // Also show a never-hot twin for transparency.
    const cold = makeChain('cold-' + Math.random().toString(36).slice(2));
    const coldGot = cold(...args);

    setStatus(pass ? 'pass' : 'fail', pass ? 'PASS' : 'FAIL — mismatch');
    log([
      'warmup_iters: ' + WARMUP_ITERS.toLocaleString() + ' (+50k)',
      'warmup_ms:    ' + warmMs,
      'maxFeedback:  ' + MAX_FEEDBACK + '  (2^50 - 1)',
      'x:            ' + x,
      'args:         10×x + 10×(-x)',
      '',
      'expected:     ' + expected + '  (correct Number rounding, then |0)',
      'optimized:    ' + got,
      'cold twin:    ' + coldGot,
      '',
      pass
        ? 'No mismatch. Either TF does not use AdditiveSafeInteger here, or the bug is fixed/disabled in this build.'
        : 'Mismatch reproduced: optimized Int32 add-chain disagreed with JS Number rounding.',
    ]);

    runBtn.disabled = false;
  }

  runBtn.addEventListener('click', () => {
    run().catch((e) => {
      setStatus('fail', 'Error');
      log([String(e && e.stack || e)]);
      runBtn.disabled = false;
    });
  });
})();
</script>
</body>
</html>
