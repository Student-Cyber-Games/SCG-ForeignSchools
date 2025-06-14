import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { stringify } from 'csv-stringify/sync';

// === Cesty ===
const inputDir = '../data';         
const outputDir = '../csv-output'; 

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

// === Export jedné databáze ===
async function exportDbToCsv(dbPath, csvPath) {
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  try {
    const rows = await db.all('SELECT * FROM schools');
    const csv = stringify(rows, {
      header: true,
      columns: [
        'skz', 'name', 'street', 'zip', 'city',
        'phone', 'email', 'website', 'principal', 'school_type'
      ]
    });
    fs.writeFileSync(csvPath, csv);
    console.log(`✅ ${csvPath}`);
  } catch (err) {
    console.warn(`⚠️  Přeskočeno: ${dbPath} – ${err.message}`);
  } finally {
    await db.close();
  }
}

// === Rekurzivní průchod složkami ===
async function walkAndExport(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkAndExport(fullPath); // rekurze
    } else if (entry.isFile() && entry.name.endsWith('.db')) {
      // Vytvoření cesty pro výstup
      const relativePath = path.relative(inputDir, fullPath);
      const csvOutputPath = path.join(outputDir, relativePath.replace(/\.db$/, '.csv'));
      const csvDir = path.dirname(csvOutputPath);
      if (!fs.existsSync(csvDir)) fs.mkdirSync(csvDir, { recursive: true });

      await exportDbToCsv(fullPath, csvOutputPath);
    }
  }
}

// === Start ===
walkAndExport(inputDir).catch(console.error);
