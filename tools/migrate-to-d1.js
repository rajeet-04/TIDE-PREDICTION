import fs from "fs";
import { stations } from "@neaps/tide-database";

console.log(`Loaded ${stations.length} stations from @neaps/tide-database`);

// 1. Create stations_index.json
console.log("Generating src/data/stations_index.json...");
const index = stations.map(s => {
    const id = s.id || s.source?.id;
    const lat = s.lat || s.latitude;
    const lon = s.lon || s.longitude;
    return { id, lat, lon };
});

if (!fs.existsSync("./src/data")) {
    fs.mkdirSync("./src/data", { recursive: true });
}
// Use a compact JSON format to save space
fs.writeFileSync("./src/data/stations_index.json", JSON.stringify(index));
console.log(`Saved index with ${index.length} entries.`);

// 2. Create schema.sql
console.log("Generating tools/schema.sql...");
const schemaSql = `
DROP TABLE IF EXISTS stations;
CREATE TABLE stations (
    id TEXT PRIMARY KEY,
    data TEXT
);
`;
fs.writeFileSync("./tools/schema.sql", schemaSql);

// 3. Create bulk_insert.sql
console.log("Generating tools/bulk_insert.sql...");
const BATCH_SIZE = 50; // SQLite limit for max compound SELECT/INSERT statements might apply
let insertSql = '';

// D1 is SQLite, we must escape single quotes
const escapeSql = (str) => str.replace(/'/g, "''");

for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    insertSql += "INSERT INTO stations (id, data) VALUES\n";
    insertSql += batch.map(s => {
        const id = s.id || s.source?.id;
        const dataStr = JSON.stringify(s);
        return `('${escapeSql(id)}', '${escapeSql(dataStr)}')`;
    }).join(",\n") + ";\n";
}

fs.writeFileSync("./tools/bulk_insert.sql", insertSql);
console.log("Done! Generated schema.sql and bulk_insert.sql for D1.");
