import fs from "fs";
import xlsx from "xlsx";
import sqlite3 from "sqlite3";
import { mkdirSync, existsSync } from "fs";

const outputDirectory = "../data/germany";
const outputFileName = "thueringen.db";
const xlsFile = xlsx.readFile("../raw_data/schulen-thueringen.xls");
const sheet = xlsFile.Sheets[xlsFile.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet);

function translateSchoolType(type) {
    const t = type.toLowerCase();

    if (t === "gymnasium" || t === "gymnasium in freier trägerschaft") {
        return "Gymnázium";
    }
    if (t === "berufsbildende schule" || t === "berufsbildende schule in freier trägerschaft") {
        return "Odborná škola";
    }
    if (t === "kolleg") {
        return "Kolleg (maturita pro dospělé)";
    }

    return null;
}

const whitelist = [
    "gymnasium",
    "gymnasium in freier trägerschaft",
    "berufsbildende schule",
    "berufsbildende schule in freier trägerschaft",
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

for (const school of data) {
    counter++;
    if (counter % 100 === 0) {
        console.log(`Zpracováno ${counter} řádků...`);
    }

    const schoolType = school.Schulart.toLowerCase() || "";
    const matched = whitelist.find(type => schoolType.includes(type));

    if (!matched) {
      // console.log(`Skipping row with unmatched type: ${schoolType}`);
      continue;
    }

    const translatedType = translateSchoolType(schoolType);

    const record = {
      skz: school.Schulnummer ? school.Schulnummer.toString().trim() : '',
      name: school.Name ? school.Name.toString().trim() : '',
      street: school.Strasse ? school.Strasse.toString().trim() : '',
      zip: school.Plz ? school.Plz.toString().trim() : '',
      city: school.Ort ? school.Ort.toString().trim() : '',
      phone: school.Telefon ? school.Telefon.toString().trim() : '', 
      email: school.Email ? school.Email.toString().trim() : '',
      website: school.Internet ? school.Internet.toString().trim() : '',
      principal: '', // Ředitel není v XLS souboru
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
}

function cleanText(val) {
  if (!val) return '';
  return val.replace(/^="|^"|^'+|"$|'+$/g, '').trim();
}
