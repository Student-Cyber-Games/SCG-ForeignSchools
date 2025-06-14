import fs from 'fs';
import csv from 'csv-parser';
import sqlite3 from 'sqlite3';
import { mkdirSync, existsSync } from "fs";

const outputDirectory = "../data/poland";
const outputFileName = 'poland.db';
const CSV_FILE = '../raw_data/rspo_2025_06_04.csv';

// Helper pro překlad typu školy do češtiny
function translateSchoolType(typ) {
    switch (typ) {
      case 'Liceum ogólnokształcące':
        return 'Gymnázium';
      case 'Technikum':
        return 'Střední odborná škola (technická)';
      case 'Branżowa szkoła II stopnia':
        return 'Nástavbová odborná škola';
      default:
        return null;
    }
}

const whitelist = [
    'Liceum ogólnokształcące',
    'Technikum',
    'Branżowa szkoła II stopnia',
];
  

if (!existsSync(outputDirectory)) {
    mkdirSync(outputDirectory, { recursive: true });
}

// Vytvoření databáze
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

fs.createReadStream(CSV_FILE)
  .pipe(csv({ separator: ';' }))
  .on('data', (row) => {
    const originalType = row['Typ'];
    if (!whitelist.includes(originalType)) return;
    
    const translatedType = translateSchoolType(originalType);

    const record = {
      skz: row[Object.keys(row).find(k => k.trim().toLowerCase() === 'numer rspo')],
      name: row['Nazwa'],
      zip: cleanText(row['Kod pocztowy']),
      street: `${cleanText(row['Ulica'])} ${cleanText(row['Numer budynku'])}`.trim(),
      city: row['Miejscowość'],
      phone: `+48 ${cleanText(row['Telefon'])}`,
      email: row['E-mail'],
      website: row['Strona www'],
      principal: row['Imię i nazwisko dyrektora'],
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