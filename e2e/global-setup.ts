const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

async function waitForOk(url: string, timeoutMs = 30_000) {
  const start = Date.now();
  let lastErr: unknown = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `Timed out waiting for ${url} (last error: ${String(lastErr)}).\n` +
      `Bring the stack up first:  docker compose up -d --build`,
  );
}

export default async function globalSetup() {
  await waitForOk(`${baseURL}/healthz`);
  await waitForOk(`${baseURL}/api/health`);
}
