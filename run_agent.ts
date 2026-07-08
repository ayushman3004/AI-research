import { graph } from './lib/agent/graph.js';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env.local manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const value = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = value;
      }
    }
  }
}

async function run() {
  const companyName = process.argv[2] || 'Apple Inc.';
  console.log(`Invoking agent for ${companyName}...`);
  try {
    const res = await graph.invoke({
      companyName: companyName
    });
    console.log('Result:', JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Agent invocation crashed:', err);
  }
}

run();
