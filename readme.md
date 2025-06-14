Requirements
---
- Node.js, npm

Setup
---
Run in root directory to install packages required to run the scripts
```bash
npm i
```

Usage
---
To run individual scripts, navigate to `lib/country` directory and run
```bash
node filename.js
```
Scripts with `puppeteer` in their name use webscraping, scripts with `parser` use csv/xml/xls files found in `raw_data`. 
Some regions require running both a parser and a puppeteer script.

By default results from scripts get saved in `data/country` as sqlite3 databases, to export to .csv files, run `sql2csv.js`. This will export all `.db` files in `/data` into `.csv` files.