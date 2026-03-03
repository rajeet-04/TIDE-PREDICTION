import { DatabaseSync } from "node:sqlite";
import { stations } from "../node_modules/@neaps/tide-database/dist/index.js";

// First, find the SQLite file automatically
import fs from "fs";
import path from "path";
const dir = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const files = fs.readdirSync(dir).filter(f => f.endsWith('.sqlite'));
if (files.length === 0) {
    console.error("No SQLite file found");
    process.exit(1);
}
const dbPath = path.join(dir, files[0]);

const db = new DatabaseSync(dbPath);

console.log("Creating table...");
db.exec(`
DROP TABLE IF EXISTS stations;
CREATE TABLE stations (
    id TEXT PRIMARY KEY,
    data TEXT
);
`);

console.log("Inserting stations...");
const insert = db.prepare("INSERT INTO stations (id, data) VALUES (?, ?)");

db.exec("BEGIN");
let count = 0;
for (const s of stations) {
    const id = s.id || s.source?.id;
    const dataStr = JSON.stringify(s);
    insert.run(id, dataStr);
    count++;
}
db.exec("COMMIT");

console.log(`Successfully seeded ${count} stations directly into ${dbPath}.`);
