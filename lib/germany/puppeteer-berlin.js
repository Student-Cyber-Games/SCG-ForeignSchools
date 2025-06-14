import puppeteer from "puppeteer";
import sqlite3 from "sqlite3";
import { mkdirSync, existsSync } from "fs";
sqlite3.verbose();

const outputDirectory = "../data/germany";
const outputFileName = "brandenburg-schools.db";
// ** Z nejakeho duvodu je tenhle kod stejny jako pro brandenburg **
// function translateSchoolType(type) {
//   const t = type.toLowerCase();

//   if (t === "gymnasium") return "Gymnázium";

//   if (t === "osz") return "Integrované středisko vyššího vzdělávání (OSZ)";
  
//   if (t === "osz mit beruflichem gymnasium")
//     return "OSZ s odborným gymnáziem";

//   if (t === "berufliche schule in freier trägerschaft")
//     return "Soukromá odborná škola";

//   if (t === "berufliche schule in fr. trägerschaft mit beruflichem gymnasium")
//     return "Soukromá odborná škola s gymnáziem";

//   if (t === "fachschule") return "Vyšší odborná škola";

//   if (t === "oberschule") return "Střední škola (Oberschule)";

//   return null; // nezahrnuté nebo neznámé
// }


// const pageLimit = 8;
// const hrefs = []

// if (!existsSync(outputDirectory)) {
//     mkdirSync(outputDirectory, { recursive: true });
// }

// const db = new sqlite3.Database(`${outputDirectory}/${outputFileName}`);
// db.serialize(() => {
//     db.run(`DROP TABLE IF EXISTS schools`);

//     db.run(`CREATE TABLE IF NOT EXISTS schools (
//     skz TEXT PRIMARY KEY,
//     name TEXT,
//     street TEXT,
//     zip TEXT,
//     city TEXT,
//     phone TEXT,
//     email TEXT,
//     website TEXT,
//     principal TEXT,
//     school_type TEXT
//   )`);

//     console.log(`Databáze ${outputFileName} byla vytvořena.`);
// });

// console.time("Puppeteer Brandenburg Schools");

// (async () => {
//     const browser = await puppeteer.launch({ headless: true });
//     const page = await browser.newPage();

//     for (let i = 0; i <= pageLimit; i++) {
//         const url = `https://schulen.brandenburg.de/suche?type=nameSearch&resultType=list&page=${i}&showFilters=true&searchString=&filterSchulform=12&filterSchulform=20&filterSchulform=21&filterSchulform=22&filterSchulform=25&filterSchulform=33&filterTraeger=`;

//         await page.goto(url, { waitUntil: "domcontentloaded" });

//         const newHrefs = await page.$$eval("#resultListWrapper a[href]", (anchors) => anchors.map((a) => a.href));

//         console.log(`Nalezeno odkazů na stránce ${i}: ${newHrefs.length}`);
//         hrefs.push(...newHrefs);
//     }

//     for (const href of hrefs) {
//       await page.goto(href, { waitUntil: "domcontentloaded" });
      
//       let school = await page.evaluate(() => {
//         function clean(text) {
//           return text?.trim().replace(/\s+/g, ' ') || '';
//         }
      
//         const name = clean(document.querySelector('h1')?.innerText);
//         let city = clean(document.querySelector('.subtitle')?.innerText); // Changed to `let`
      
//         // Kontakt - adresa
//         const kontaktBlock = document.querySelector('#propertyBasedata .base-data-widget p');
//         let street = '', zip = '', cityLine = ''; // Changed to `let`
//         if (kontaktBlock) {
//           const lines = kontaktBlock.innerText.split('\n');
//           street = clean(lines[0]);
//           cityLine = clean(lines[1]);
//           const match = cityLine.match(/^(\d{5})\s+(.*)$/);
//           if (match) {
//             zip = match[1];
//             city = match[2]; // Reassigning `city`
//           }
//         }
      
//         // Kontakt - telefon, email
//         const tel = clean(document.querySelector('a[href^="tel:"]')?.innerText);
//         const emailSpan = document.querySelector('.spamspan');
//         let email = ''; // Changed to `let`
//         if (emailSpan) {
//           const u = emailSpan.querySelector('.u')?.innerText || '';
//           const d = emailSpan.querySelector('.d')?.innerText || '';
//           email = `${u}@${d.replace(/\s*\[dot\]\s*/g, '.').replace(/\s+/g, '')}`; // Reassigning `email`
//         }
      
//         // Ostatní údaje
//         const admBlock = [...document.querySelectorAll('#propertyBasedata .base-data-widget p')].find(p => p.innerText.includes('Schulnummer'));
//         let skz = '', school_type = '', principal = ''; // Changed to `let`
//         if (admBlock) {
//           const text = admBlock.innerText;
//           skz = (text.match(/Schulnummer:\s*(\d+)/) || [])[1] || ''; // Reassigning `skz`
//           school_type = (text.match(/Schulform:\s*([^\n]+)/) || [])[1] || ''; // Reassigning `school_type`
//           principal = (text.match(/Leitung:\s*([^\n]+)/) || [])[1] || ''; // Reassigning `principal`
//         }
      
//         return {
//           skz,
//           name,
//           street,
//           zip,
//           city,
//           phone: tel,
//           email,
//           website: '', 
//           principal,
//           school_type
//         };
//       });

//     school.school_type = translateSchoolType(school.school_type);

//     db.run(`INSERT OR REPLACE INTO schools (
//       skz, name, street, zip, city,
//       phone, email, website, principal, school_type
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       school.skz, school.name, school.street, school.zip, school.city,
//       school.phone, school.email, school.website, school.principal, school.school_type
//     ], (err) => {
//       if (err) console.error('Chyba:', err.message);
//     });

//     console.log(`Parsed school [${hrefs.indexOf(href) + 1}/${hrefs.length}]`);

//     await new Promise(resolve =>
//       setTimeout(resolve, Math.floor(Math.random() * (600 - 300 + 1)) + 300)
//     );
//     }

//     await browser.close();
//     db.close();

//     console.timeEnd("Puppeteer Brandenburg Schools");
// })();
