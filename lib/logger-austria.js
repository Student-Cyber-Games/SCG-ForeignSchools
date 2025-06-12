// count.js
import sqlite3 from 'sqlite3';
sqlite3.verbose();

const db = new sqlite3.Database('../data/austria/upper_austria-it.db');
db.all("SELECT * FROM schools", [], (err, rows) => {
  if (err) {
    throw err;
  }
  rows.forEach((row) => {
    console.log(row);
  });
  db.close();
});
