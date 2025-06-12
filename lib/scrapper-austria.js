import { readFile } from "fs";
import { Parser } from "xml2js";
import sqlite3 from "sqlite3";
sqlite3.verbose();

import { mkdirSync, existsSync } from "fs";

// Upper Austria
const xmlFile = "../raw_data/schooldata-austria.xml";
const outputDirectory = "../data/austria";
const outputFileName = 'upper_austria-all.db';
// const outputFileName = "upper_austria-it.db";

const parser = new Parser();

readFile(xmlFile, (err, data) => {
    if (err) throw err;

    parser.parseString(data, (err, result) => {
        if (err) throw err;

        const schools = result.Schulen.Schuldaten;

        if (!existsSync(outputDirectory)) {
            mkdirSync(outputDirectory, { recursive: true });
        }

        const db = new sqlite3.Database(`${outputDirectory}/${outputFileName}`, (err) => {
            if (err) {
                console.error("Failed to open database:", err.message);
                process.exit(1);
            }
        });

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

            const stmt = db.prepare(`
                INSERT OR IGNORE INTO schools 
                (skz, name, street, zip, city, phone, email, website, principal, school_type) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            let addedCount = 0;

            for (const s of schools) {
                const skz = s.SKZ?.[0] || "";
                const type = translateSchoolType(s.Schultyp?.[0]?.trim()) || "";

                // Filter for specific (IT) school types
                // if (!type.match(/(Polytechnická škola|Technická škola)/i)) continue;

                const name = s.Schule?.[0] || "";
                const street = s.Straße?.[0] || "";
                const zip = s.PLZ?.[0] || "";
                const city = s.Ort?.[0] || "";
                const phone = s.Telefon?.[0] || "";
                const email = s["E-Mail"]?.[0] || "";
                const website = s.Webseite?.[0] || "";
                const principal = `${s.Anrede?.[0] || ""} ${s.Vorname?.[0] || ""} ${s.Nachname?.[0] || ""}`.trim();

                stmt.run(skz, name, street, zip, city, phone, email, website, principal, type);
                addedCount++;
            }

            stmt.finalize();

            console.log(`Total schools added: ${addedCount}`);
        });

        db.close();
    });
});

function translateSchoolType(type) {
    switch (type) {
        case "Volksschule":
            return "Základní škola";
        case "Mittelschule":
            return "Nižší střední škola";
        case "AHS":
            return "Všeobecná střední škola (gymnázium)";
        case "Berufsschule":
            return "Odborné učiliště";
        case "Polytechnische Schule":
            return "Polytechnická škola";
        case "Sonderschule":
            return "Speciální škola";
        case "Technische":
            return "Technická škola";
        case "Humanberufliche":
            return "Humanitně zaměřená škola";
        case "Kaufmännische":
            return "Obchodní škola";
        case "Lehrerbildende mittlere und höhere Schulen":
            return "Střední a vyšší školy pro přípravu učitelů";
        case "Landwirtschaftliche Schulen":
            return "Zemědělská škola";
        case "Sonstige":
            return "Jiné";
        default:
            return "Neznámý typ školy";
    }
}
