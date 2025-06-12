import fs from 'fs';
import csvParser from 'csv-parser';
import iconv from 'iconv-lite';
import sqlite3 from 'sqlite3';
import { mkdirSync, existsSync } from "fs";

const CSV_FILE = '../raw_data/schulen_noe.csv';
const outputDirectory = "../data/austria";
const outputFileName = 'niederosterreich.db';

  const whitelist = [
    // 🟢 Gymnázia a všeobecné střední školy
    'AHS GYM',
    'AHS GYM ORG',
    'AHS ORG',
  
    // 🟢 Technické školy (HTL, TMS, THS, TWS)
    'BHS HTL',
    'HTL',
    'BBS T$S',
    'BBS T$S THS',
    'BBS T$S THS TMS',
    'BBS T$S THS TMS KOLL',
    'BBS T$S TMS',
    'BBS T$S TMS KOLL',
    'BBS T$S TMS THS',
    'BBS T$S TMS THS KOLL',
    'BBS T$S TWS',
    'BBS T$S TWS THS KOLL',
  
    // 🟢 Učiliště, odborné školy
    'BPS BRS',
    'BS',
    'PTS',
  
    // 🟡 Obchodní akademie a ekonomické školy
    'BBS W$S',
    'BBS W$S WHS MODE',
    'BBS W$S WHS WMS',
    'BBS W$S WHS WMS TOUR',
    'BBS W$S WHS WMS TOUR KOLL',
    'BBS W$S WMS',
    'BBS W$S WMS GES',
    'BBS W$S WMS SOZ',
    'BBS W$S WMS WHS',
    'BBS W$S WMS WHS KOLL',
    'BBS W$S WMS WHS TOUR',
    'BBS W$S GES WMS',
    'BBS W$S PAI',
    'BBS W$S SOZ',
    'BBS W$S SOZ KOLL',
  
    // 🟡 Kombinované obchodní školy (např. HAK/HLW/HAS)
    'BBS K$S KHS KMS',
    'BBS K$S KMS',
    'BBS K$S KMS KHS',
    'BBS K$S KMS KHS KOLL',
    'AHS BBS ORG K$S KMS KHS',
  
    // 🟡 Sociální, zdravotnické, pedagogické
    'BBS SOZ W$S',
    'BBS GES',
    'BBS BAKIP',
    'BBS BAKIP KOLL',
    'PAI',
  
    // 🟡 Zemědělské a přírodní školy
    'BBS LFS',
  
    // 🟡 Vysoké odborné školy
    'FH'
  ];

  function translateSchoolType(type) {
    const t = type.toUpperCase();
  
    if (t.includes('GYM')) return 'Gymnázium';
    if (t.includes('HTL')) return 'Technická škola';
    if (t.includes('T$S') || t.includes('THS') || t.includes('TMS') || t.includes('TWS')) return 'Technická odborná škola';
    if (t.includes('PTS')) return 'Polytechnická škola';
    if (t.includes('BS') || t.includes('BPS') || t.includes('BRS')) return 'Učiliště';
    if (t.includes('K$S') || t.includes('KMS') || t.includes('KHS')) return 'Střední odborná škola (kombinovaná)';
  
    return null;
  }
  
if (!existsSync(outputDirectory)) {
  mkdirSync(outputDirectory, { recursive: true });
}

const db = new sqlite3.Database(`${outputDirectory}/${outputFileName}`);
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS schools`);
  db.run(`CREATE TABLE IF NOT EXISTS schools (
    skz TEXT PRIMARY KEY,
    name TEXT,
    street TEXT,
    zip TEXT,
    city TEXT,
    phone TEXT,
    email TEXT,
    website TEXT,
    principal TEXT,
    school_type TEXT
  )`);
});

let counter = 0;
let unique = []
fs.createReadStream(CSV_FILE)
  .pipe(iconv.decodeStream('latin1'))           // ⬅️ převod z ISO-8859-1 na UTF-8
  .pipe(iconv.encodeStream('utf8'))             // ⬅️ znovu zakóduj jako validní UTF-8 pro parser
  .pipe(csvParser({ separator: ';' }))
  .on('data', (row) => {
    const type = row['art'] ? row['art'] : '';

    if (!whitelist.includes(type)) return;

    const translatedType = translateSchoolType(row['art']);
    if (!translatedType) return;

    const record = {
      skz: cleanText(row['skz']),
      name: cleanText(row['name']),
      street: cleanText(row['strasse']),
      zip: cleanText(row['plz']),
      city: cleanText(row['ort']),
      phone: cleanText(row['tel']),
      email: cleanText(row['mail_vw']),
      website: cleanText(row['url_hp']),
      principal: '', // není v CSV – zůstane prázdné
      school_type: translatedType
    };

    db.run(`INSERT OR IGNORE INTO schools (
      skz, name, street, zip, city,
      phone, email, website, principal, school_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.skz, record.name, record.street, record.zip, record.city,
      record.phone, record.email, record.website, record.principal, record.school_type
    ], (err) => {
      if (err) console.error('Chyba:', err.message);
    });

    counter++;
    if (counter % 100 === 0) {
      console.log(`Zpracováno ${counter} řádků...`);
    }
  })
  .on('end', () => {
    console.log(`\n✅ Celkem zpracováno: ${counter} řádků.`);
    db.close();
  });

function cleanText(val) {
  if (!val) return '';
  return val.replace(/^="|^"|^'+|"$|'+$/g, '').trim();
}
