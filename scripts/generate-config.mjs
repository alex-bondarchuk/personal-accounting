import { access, writeFile } from 'node:fs/promises';

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';
const target = new URL('../supabase-config.js', import.meta.url);

if (!url && !anonKey) {
  try { await access(target); console.log('Using existing supabase-config.js'); } catch { await writeFile(target, 'window.OBLIK_SUPABASE = { url: "", anonKey: "" };\n', 'utf8'); }
} else {
  const config = `window.OBLIK_SUPABASE = ${JSON.stringify({ url, anonKey }, null, 2)};\n`;
  await writeFile(target, config, 'utf8');
  console.log('supabase-config.js generated from environment variables');
}

