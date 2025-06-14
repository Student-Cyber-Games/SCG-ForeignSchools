import fs from 'fs';
import csv from 'csv-parser';
import sqlite3 from 'sqlite3';
import { mkdirSync, existsSync } from "fs";

const outputDirectory = "../data/germany";
const outputFileName = 'sachsen.db';
const CSV_FILE = '../raw_data/schulen-saxen2.csv';

// Překlad typů škol z názvu
function translateSchoolType(name) {
  const n = name.toLowerCase();
  if (n.includes("gymnasium")) return "Gymnázium";
  if (n.includes("oberschule")) return "Střední škola (Oberschule)";
  if (n.includes("berufsschule")) return "Odborné učiliště";
  if (n.includes("berufliches gymnasium")) return "Odborné gymnázium";
  if (n.includes("fachoberschule")) return "Vyšší odborná škola";
  if (n.includes("fachschule")) return "Vyšší odborná škola (Fachschule)";
  if (n.includes("berufsfachschule")) return "Střední odborná škola";
  return null;
}

const whitelist = [
  "gymnasium", "oberschule", "berufsschule",
  "berufliches gymnasium", "fachoberschule", "fachschule", "berufsfachschule"
];

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

  console.log(`Databáze ${outputFileName} byla vytvořena.`);
});

let counter = 0;

fs.createReadStream(CSV_FILE)
  .pipe(csv({ separator: ',' }))
  .on('data', (row) => {
    const name = row['name']?.toLowerCase() || "";
    const matched = whitelist.find(type => name.includes(type));
    if (!matched) return;

    const translatedType = translateSchoolType(name);
    const record = {
      skz: row['institution_key'] || row['id'],
      name: cleanText(row['name']),
      zip: cleanText(row['postcode']),
      street: cleanText(row['street']),
      city: cleanText(row['community']),
      phone: `+49 ${cleanText(row['phone_number_1'])}`,
      email: row['mail'],
      website: row['homepage'],
      principal: `${cleanText(row['headmaster_firstname'])} ${cleanText(row['headmaster_lastname'])}`.trim(),
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
    console.log(`\nCelkem zpracováno: ${counter} řádků.`);
    db.close();
  });

function cleanText(val) {
  if (!val) return '';
  return val.replace(/^="|^"|^'+|"$|'+$/g, '').trim();
}
