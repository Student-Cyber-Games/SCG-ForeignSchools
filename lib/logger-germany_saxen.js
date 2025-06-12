// count.js
import sqlite3 from 'sqlite3';
sqlite3.verbose();

// Ensure the database file exists at the specified path
const db = new sqlite3.Database('../data/germany/sachsen-schools.db', (err) => {
  if (err) {
    console.error("Failed to open database:", err.message);
    process.exit(1); // Exit if the database cannot be opened
  }
});
db.all("SELECT * FROM schools LIMIT 10", [], (err, rows) => {
  if (err) {
    throw err;
  }
  rows.forEach((row) => {
    console.log(row);
  });
  db.close();
});
