// Faux serveur Lightspeed — tests uniquement.
import http from 'node:http';

export async function startFakeLightspeed({ pages, token = 'test-token' }) {
  const server = http.createServer((req, res) => {
    if (req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401); return res.end(); }
    const u = new URL(req.url, 'http://x');
    const i = Number(u.searchParams.get('page') || 0);
    const next = i + 1 < pages.length ? `/api/2.0/sales?page=${i + 1}` : null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: pages[i] || [], next }));
  });
  await new Promise((r) => server.listen(0, r));
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => server.close(r)) };
}
