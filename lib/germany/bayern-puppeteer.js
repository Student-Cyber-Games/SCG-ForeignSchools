import puppeteer from 'puppeteer';
import sqlite3 from 'sqlite3';
sqlite3.verbose();

// z schulen-bayern.csv vezme odkazy na podstranky skol, ty pote projde skrz puppeteer

const db = new sqlite3.Database('../data/germany/bayern.db');

// Vrací promise s polem všech škol s SKZ
function getSchools() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT * FROM schools LIMIT 1 OFFSET 5`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Aktualizuje telefon, fax a web pro dané SKZ
function updateSchool(id, phone, fax, newWebsite) {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE schools SET phone = ?, email = ?, website = ? WHERE id = ?`,
        [phone, fax, newWebsite, id],
        function (err) {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

console.time('Puppeteer Bayern Schools')
let failedSchools = [];

  (async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
  
    const schools = await getSchools();
  
    for (let index = 0; index < schools.length; index++) {
      const school = schools[index];
      const skz = school.skz;
      const url = school.website;
  
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
  
        const data = await page.evaluate(() => {
          const paragraphs = Array.from(document.querySelectorAll('section.rxModuleSection p'));
          const contactParagraph = paragraphs[1]?.innerText || '';
  
          const phone = [...contactParagraph.matchAll(/Telefon:\s*([0-9\/()\s\-]+)/gi)][0]?.[1]?.trim() || null;
          const fax = [...contactParagraph.matchAll(/Fax:\s*([0-9\/()\s\-]+)/gi)][0]?.[1]?.trim() || null;
          const website = document.querySelector('a.website')?.href?.trim() || null;
  
          return { raw: contactParagraph, phone, fax, website };
        });
  
        console.log(data.raw);
  
        await updateSchool(school.id, data.phone, data.fax, data.website);
        console.log(`[${index + 1}/${schools.length}] ✅ ${skz} OK`);
      } catch (err) {
        console.error(`[${index + 1}/${schools.length}] ❌ ${skz}: ${err.message}`);
        failedSchools.push({ skz, url, error: err.message });
      }
  
      // Pauza mezi iteracemi (např. 300–600 ms)
      await new Promise(resolve =>
        setTimeout(resolve, Math.floor(Math.random() * (600 - 300 + 1)) + 300)
      );
    }
  
    await browser.close();
    db.close();

    console.timeEnd('Puppeteer Bayern Schools');
    console.log("Failed schools:", failedSchools.length);
    if (failedSchools.length > 0) {
      console.log("Failed schools details:", failedSchools);
    }
  })();
  