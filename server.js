import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;
const API_KEY = process.env.COMPANIES_HOUSE_API_KEY;

if (!API_KEY) {
  console.warn(
    '\u001b[33mWarning: COMPANIES_HOUSE_API_KEY is not set. The API proxy will return 500.\u001b[0m'
  );
}

// ✅ Correctly resolve to the project’s /public folder
const PUBLIC_DIR = path.resolve(__dirname, 'nottingham-sme-finder/public');

// Serve static frontend files
app.use(express.static(PUBLIC_DIR));

// Root route → serve index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Helper: clamp numbers
const clamp = (n, min, max) =>
  Math.min(Math.max(parseInt(n, 10) || 0, min), max);

// Proxy to Companies House Advanced Search
app.get('/api/companies', async (req, res) => {
  try {
    const {
      location = 'Nottingham',
      status = 'active',
      sic = '',
      types = '',
      incorporated_from = '',
      incorporated_to = '',
      size = '100',
      start_index = '0',
    } = req.query;

    const params = new URLSearchParams();
    if (location) params.set('location', location);
    if (status) params.set('company_status', status);
    if (sic) params.set('sic_codes', sic);
    if (types) params.set('company_type', types);
    if (incorporated_from) params.set('incorporated_from', incorporated_from);
    if (incorporated_to) params.set('incorporated_to', incorporated_to);
    params.set('size', String(clamp(size, 1, 5000)));
    params.set(
      'start_index',
      String(Math.max(0, parseInt(start_index, 10) || 0))
    );

    const url = `https://api.company-information.service.gov.uk/advanced-search/companies?${params.toString()}`;

    const auth = Buffer.from(`${API_KEY}:`).toString('base64');
    const chRes = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!chRes.ok) {
      const text = await chRes.text();
      return res
        .status(chRes.status)
        .json({ error: 'Upstream error', status: chRes.status, body: text });
    }

    const data = await chRes.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error', details: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Nottingham SME Finder running on http://localhost:${PORT}`);
});
