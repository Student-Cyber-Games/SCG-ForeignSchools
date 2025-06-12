import fs from 'fs';
import csv from 'csv-parser';
import sqlite3 from 'sqlite3';
import { mkdirSync, existsSync } from "fs";

const outputDirectory = "../data/germany";
const outputFileName = 'bayern-schools.db';
const CSV_FILE = '../raw_data/schulen-bayern.csv';

function translateSchoolType(type) {
    const t = type.toLowerCase();
  
    if (t.includes("gymnasium")) return "Gymnázium";
    if (t.includes("realschule")) return "Střední škola (Reálka)";
    if (t.includes("fachoberschule")) return "Vyšší odborná škola (FOS)";
    if (t.includes("berufsoberschule")) return "Nástavbová odborná škola (BOS)";
    if (t === "berufsschule") return "Odborné učiliště";
    if (t.includes("berufsfachschule des gesundheitswesens")) return "Střední zdravotnická škola";
    if (t.includes("berufsfachschulen f. fremdsprachenberufe")) return "Jazyková odborná škola";
    if (t === "wirtschaftsschule") return "Ekonomická odborná škola";
    if (t === "gewerbliche fachschulen" || t === "gewerbliche berufsfachschulen") return "Technická odborná škola";
    if (t.includes("kaufmännische berufsfachschulen") || t.includes("kaufmännische fachschulen")) return "Obchodní odborná škola";
    if (t.includes("bfs hausw.") || t.includes("hauswirtschaftliche")) return "Sociálně-zdravotní odborná škola";
    if (t === "fachakademie" || t.includes("fachakademien")) return "Vyšší odborná akademie";
    if (t === "sonstige fachschulen") return "Jiná vyšší odborná škola";
    if (t.includes("berufsfachschulen f. techn. assistenzberufe")) return "Technická odborná škola (asistenti)";
    if (t.includes("berufsfachschulen f. musik")) return "Hudební odborná škola";
    if (t === "abendgymnasium") return "Večerní gymnázium";
    if (t === "abendrealschule") return "Večerní reálka";
    if (t === "kolleg") return "Kolleg (maturita pro dospělé)";
    if (t === "landwirtschaftliche fachschulen") return "Zemědělská odborná škola";
  
    return null; // nepřeložitelné nebo nezahrnuté
  }
  

  const whitelist = [
    "gymnasium",
    "realschule",
    "fachoberschule",
    "berufsoberschule",
    "berufsschule",
    "berufsfachschule des gesundheitswesens",
    "berufsfachschulen f. fremdsprachenberufe",
    "wirtschaftsschule",
    "gewerbliche fachschulen",
    "gewerbliche berufsfachschulen",
    "kaufmännische berufsfachschulen",
    "bfs hausw., gastgew. und soziale berufe",
    "hauswirtschaftliche und sozialberufliche fachschulen",
    "fachakademie",
    "sonstige fachschulen",
    "berufsfachschulen f. techn. assistenzberufe",
    "berufsfachschulen f. musik",
    "abendgymnasium",
    "abendrealschule",
    "kolleg",
    "landwirtschaftliche fachschulen",
    "fachakademien für landwirtschaft",
    "kaufmännische fachschulen"
  ];
  

if (!existsSync(outputDirectory)) {
  mkdirSync(outputDirectory, { recursive: true });
}

const db = new sqlite3.Database(`${outputDirectory}/${outputFileName}`);
db.serialize(() => {
  db.run(`DROP TABLE IF EXISTS schools`);

  db.run(`CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skz TEXT,
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

fs.createReadStream(CSV_FILE)
  .pipe(csv({ separator: ';', mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '') }))
  .on('data', (row) => {
    counter++;

    if (counter % 100 === 0) {
      console.log(`Zpracováno ${counter} řádků...`);
    }

    const schoolType = row['Schultyp']?.toLowerCase() || "";
    const matched = whitelist.find(type => schoolType.includes(type));

    if (!matched) {
        // console.log(`Skipping row with unmatched type: ${schoolType}`);
        return;
    }

    const translatedType = translateSchoolType(schoolType);

    const record = {
      skz: cleanText(row['Schulnummer']),
      name: cleanText(row['Name']),
      street: cleanText(row['Straße']),
      zip: cleanText(row['PLZ']),
      city: cleanText(row['Ort']),
      phone: '',
      email: '',
      website: row['Link'],
      principal: '',
      school_type: translatedType
    };

    db.run(`INSERT OR REPLACE INTO schools (
      skz, name, street, zip, city,
      phone, email, website, principal, school_type
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.skz, record.name, record.street, record.zip, record.city,
      record.phone, record.email, record.website, record.principal, record.school_type
    ], (err) => {
      if (err) console.error('Chyba:', err.message);
    });
  })
  .on('end', () => {
    console.log(`\nCelkem zpracováno: ${counter} řádků.`);
    db.close();
  });

function cleanText(val) {
  if (!val) return '';
  return val.replace(/^="|^"|^'+|"$|'+$/g, '').trim();
}
