import fs from "fs";
import { stations } from "@neaps/tide-database";

console.log(`Loaded ${stations.length} stations from @neaps/tide-database`);

// 3. Create bulk_insert.sql
console.log("Generating tools/bulk_insert.sql with batch size 10...");
const BATCH_SIZE = 10; // D1 max query string size is 100KB. 10 * 3KB = 30KB.
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
console.log("Done! Generated bulk_insert.sql for D1.");
