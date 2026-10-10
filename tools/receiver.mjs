// Utviklerverktøy: tar imot bilder (data-URL) fra siden og lagrer dem. Brukes når skjermbilder tas i appens egen nettleser.
//   node tools/receiver.mjs [port] [mappe]   — siden gjør: fetch('http://localhost:5190/<navn>.jpg', { method: 'POST', body: dataUrl })
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const port = Number(process.argv[2]) || 5190, dir = process.argv[3] || 'docs/opus-02/screenshots';
fs.mkdirSync(dir, { recursive: true });
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const chunks = []; req.on('data', (c) => chunks.push(c)); req.on('end', () => {
    const name = path.basename(decodeURIComponent(req.url));
    const body = Buffer.concat(chunks).toString(); const b64 = body.slice(body.indexOf(',') + 1);
    fs.writeFileSync(path.join(dir, name), Buffer.from(b64, 'base64')); console.log('lagret', name); res.end('ok');
  });
}).listen(port, () => console.log('mottaker på', port));
