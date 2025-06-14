import puppeteer from "puppeteer";
import sqlite3 from "sqlite3";
import { mkdirSync, existsSync } from "fs";
sqlite3.verbose();

const outputDirectory = "../data/austria";
const outputFileName = "niederosterreich.db";

function translateSchoolType(type) {}

const pageLimit = 64;
const hrefs = [];

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

console.time("Puppeteer Niederosterreich Schools");

function extractSkzFromUrl(url) {
    const lastPart = url.split("/")[url.split("/").length - 2];
    return lastPart?.split("-")[0] || "";
}

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    for (let i = 1; i <= pageLimit; i++) {
        const url = `https://www.schulverzeichnis.eu/typ/?${i == 1 ? "" : `p=${i}&`}bundesland=niederosterreich`;

        await page.goto(url, { waitUntil: "domcontentloaded" });

        let div = await page.waitForSelector(".cardList");

        const newHrefs = await div.$$eval("a", (odkazy) => {
            const hrefSet = new Set();
            odkazy.forEach((a) => {
                const href = a.href;
                if (href.includes("www.schulverzeichnis.eu/schule")) {
                    hrefSet.add(href);
                }
            });
            return Array.from(hrefSet);
        });

        console.log(`Nalezeno odkazů na stránce ${i}: ${newHrefs.length}`);
        hrefs.push(...newHrefs);
    }

    for (let i = 0; i < hrefs.length; i++) {
        await page.goto(hrefs[i], { waitUntil: "networkidle2" });

        const record = await page.evaluate(() => {
            function clean(text) {
                return text?.trim().replace(/\s+/g, " ") || "";
            }

            function getTdAfterTh(label) {
                const rows = Array.from(document.querySelectorAll("table.infoTable tr"));
                for (const row of rows) {
                    const th = row.querySelector("th");
                    if (th && th.textContent.trim().toLowerCase().includes(label.toLowerCase())) {
                        return row.querySelector("td");
                    }
                }
                return null;
            }

            const phone = clean(getTdAfterTh("Telefon:")?.textContent);
            const email = clean(getTdAfterTh("E-Mail:")?.textContent?.split("\n")[0]); // vezmi první e-mail
            const website = clean(getTdAfterTh("WWW:")?.textContent);

            // Adresa
            const addressRaw = getTdAfterTh("Adresse:")?.innerText.split("\n").map(clean);
            const street = addressRaw?.[0] || "";
            const [zip, ...cityParts] = (addressRaw?.[1] || "").split(" ");
            const city = cityParts.join(" ");

            const principal = clean(getTdAfterTh("Direktor")?.textContent);

            // Typ školy z více kategorií
            const categoryTd = getTdAfterTh("Kategorien:");
            const categories = Array.from(categoryTd?.querySelectorAll("a") || []).map((a) => clean(a.textContent));
            const school_type = categories.join(", ");

            return {
                skz: "",
                name: document.title.replace(/\s+\|.*$/, "").trim(),
                street,
                zip,
                city,
                phone,
                email,
                website,
                principal,
                school_type,
            };
        });

        record.skz = extractSkzFromUrl(hrefs[i]);

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

        console.log(`Parsed school [${i + 1}/${hrefs.length}]`);

        await new Promise(resolve =>
          setTimeout(resolve, Math.floor(Math.random() * (600 - 300 + 1)) + 300)
        );
    }

    await browser.close();
    db.close();

    console.timeEnd("Puppeteer Niederosterreich Schools");
})();