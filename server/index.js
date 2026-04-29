const path = require('path');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.UPLOAD_SERVER_PORT ? Number(process.env.UPLOAD_SERVER_PORT) : 8787;

const ACCESS_KEY_ID = process.env.FOUREVERLAND_ACCESS_KEY_ID || process.env.FOUR_EVERLAND_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.FOUREVERLAND_SECRET_ACCESS_KEY || process.env.FOUR_EVERLAND_SECRET_ACCESS_KEY;
const BUCKET = process.env.FOUREVERLAND_BUCKET || process.env.FOUR_EVERLAND_BUCKET;
const REGION = process.env.FOUREVERLAND_REGION || 'us-east-1';

const ENDPOINT =
  process.env.FOUREVERLAND_ENDPOINT ||
  (process.env.FOUREVERLAND_ENDPOINT_BASE
    ? `${process.env.FOUREVERLAND_ENDPOINT_BASE.replace(/\/$/, '')}`
    : null);

if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing server env vars. Required:\n' +
      '- FOUREVERLAND_ACCESS_KEY_ID\n' +
      '- FOUREVERLAND_SECRET_ACCESS_KEY\n' +
      '- FOUREVERLAND_BUCKET\n' +
      'Optional:\n' +
      '- FOUREVERLAND_ENDPOINT (full)\n' +
      '- FOUREVERLAND_ENDPOINT_BASE (base)\n' +
      '- UPLOAD_SERVER_PORT'
  );
}

function buildS3Endpoint() {
  // If user provides a full endpoint, use it as-is.
  // Example: https://psa-temp.endpoint.4everland.co
  if (process.env.FOUREVERLAND_ENDPOINT) return String(process.env.FOUREVERLAND_ENDPOINT).replace(/\/$/, '');

  // Otherwise use base endpoint (path-style).
  const base = process.env.FOUREVERLAND_ENDPOINT_BASE || 'https://endpoint.4everland.co';
  return String(base).replace(/\/$/, '');
}

function isTlsHandshakeError(err) {
  const msg = (err && err.message) ? String(err.message) : '';
  return (
    msg.includes('ERR_SSL') ||
    msg.includes('SSL routines') ||
    msg.includes('alert handshake failure') ||
    msg.includes('EPROTO') ||
    msg.toLowerCase().includes('handshake')
  );
}

function buildEndpointCandidates() {
  const candidates = [];

  // Candidate 1: explicit endpoint settings (if provided)
  if (process.env.FOUREVERLAND_ENDPOINT) {
    candidates.push({ endpoint: String(process.env.FOUREVERLAND_ENDPOINT).replace(/\/$/, ''), forcePathStyle: false, label: 'explicit-virtualhost' });
    // Sometimes explicit endpoint still needs path-style
    candidates.push({ endpoint: String(process.env.FOUREVERLAND_ENDPOINT).replace(/\/$/, ''), forcePathStyle: true, label: 'explicit-pathstyle' });
  }

  // Candidate 2: base endpoint path-style (most robust)
  const base = (process.env.FOUREVERLAND_ENDPOINT_BASE || 'https://endpoint.4everland.co').replace(/\/$/, '');
  candidates.push({ endpoint: base, forcePathStyle: true, label: 'base-pathstyle' });

  // Candidate 3: bucket virtual-host style using base host
  const host = base.replace(/^https?:\/\//, '');
  candidates.push({ endpoint: `https://${BUCKET}.${host}`, forcePathStyle: false, label: 'bucket-virtualhost' });

  // de-dupe
  const seen = new Set();
  return candidates.filter(c => {
    const k = `${c.endpoint}|${c.forcePathStyle}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function makeS3Client(endpoint, forcePathStyle) {
  return new S3Client({
    region: REGION,
    endpoint,
    forcePathStyle,
    credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY }
  });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB (adjust if you need bigger)
  }
});

const app = express();
app.use(cors());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.get('/diag', async (_req, res) => {
  try {
    if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
      return res.status(500).json({ ok: false, error: 'Server missing FOUREVERLAND_* env vars.' });
    }

    const candidates = buildEndpointCandidates();
    let lastErr = null;
    let used = null;

    for (const c of candidates) {
      try {
        const client = makeS3Client(c.endpoint, c.forcePathStyle);
        await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
        used = c;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        // On TLS errors, try next candidate; otherwise also try next (AccessDenied will surface after loop if all fail)
        continue;
      }
    }

    if (lastErr) throw lastErr;

    return res.json({
      ok: true,
      bucket: BUCKET,
      endpoint: used.endpoint,
      forcePathStyle: used.forcePathStyle,
      endpointMode: used.label,
      region: REGION,
      accessKeyIdPrefix: String(ACCESS_KEY_ID).slice(0, 6) + '…'
    });
  } catch (err) {
    const msg = err?.message || String(err);
    const code = err && (err.name || err.Code || err.code);
    const requestId =
      (err && err.$metadata && (err.$metadata.requestId || err.$metadata.extendedRequestId)) ||
      err?.requestId ||
      null;
    return res.status(500).json({ ok: false, error: msg, code, requestId });
  }
});

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided. Use multipart field name "file".' });
    if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET) {
      return res.status(500).json({ error: 'Server is not configured with 4everland credentials.' });
    }

    const candidates = buildEndpointCandidates();
    const keyPrefix = req.query.keyPrefix ? String(req.query.keyPrefix) : '';
    const safePrefix = keyPrefix.replace(/^\/+/, '').replace(/\.\./g, '');
    const key = safePrefix ? `${safePrefix}/${req.file.originalname}` : req.file.originalname;

    let out = null;
    let used = null;
    let lastErr = null;

    for (const c of candidates) {
      try {
        const client = makeS3Client(c.endpoint, c.forcePathStyle);
        const task = new Upload({
          client,
          params: {
            Bucket: BUCKET,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype || 'application/octet-stream'
          }
        });
        out = await task.done();
        used = c;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        // On TLS errors, try next candidate
        if (isTlsHandshakeError(e)) continue;
        // On AccessDenied etc, still try next endpoint style once (sometimes fixes policy/host)
        continue;
      }
    }

    if (lastErr) throw lastErr;

    // 4everland SDK expects CID to be encoded as JSON inside ETag
    // Example: ETag = "\"{\"cid\":\"bafy...\"}\"" (varies)
    const rawETag = out && out.ETag ? String(out.ETag) : '';
    let cid = null;
    try {
      // Remove wrapping quotes if present
      const unquoted = rawETag.replace(/^"+|"+$/g, '');
      const parsed = JSON.parse(unquoted);
      cid = parsed && (parsed.cid || parsed.CID);
    } catch (_) {
      // ignore
    }

    if (!cid) {
      return res.status(502).json({
        error: 'Upload succeeded but CID was not returned by storage provider.',
        debug: { ETag: rawETag, endpoint: used?.endpoint, forcePathStyle: used?.forcePathStyle, bucket: BUCKET, key }
      });
    }

    return res.json({ cid, key, bucket: BUCKET, endpoint: used?.endpoint, forcePathStyle: used?.forcePathStyle });
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    const code = err && (err.name || err.Code || err.code);
    const requestId =
      (err && err.$metadata && (err.$metadata.requestId || err.$metadata.extendedRequestId)) ||
      err?.requestId ||
      null;
    return res.status(500).json({ error: msg, code, requestId });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Upload server listening on http://localhost:${PORT}`);
});

