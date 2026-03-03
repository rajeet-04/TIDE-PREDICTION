import fs from 'fs';
import { execSync } from 'child_process';
import { stations } from "../node_modules/@neaps/tide-database/dist/index.js";

const BATCH_SIZE = 100;
const escapeSql = (str) => str.replace(/'/g, "''");

console.log(`Starting to seed ${stations.length} stations in batches...`);

for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const batch = stations.slice(i, i + BATCH_SIZE);
    let insertSql = "INSERT INTO stations (id, data) VALUES\n";
    insertSql += batch.map(s => {
        const id = s.id || s.source?.id;
        const dataStr = JSON.stringify(s);
        return `('${escapeSql(id)}', '${escapeSql(dataStr)}')`;
    }).join(",\n") + ";\n";

    fs.writeFileSync('./tools/temp_batch.sql', insertSql);
    try {
        console.log(`Executing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(stations.length / BATCH_SIZE)}`);
        execSync('npx wrangler d1 execute TIDE_DB --local --file=./tools/temp_batch.sql', { stdio: 'inherit' });
    } catch (err) {
        console.error(`Failed at batch ${i}:`, err.message);
        break;
    }
}

try {
    fs.unlinkSync('./tools/temp_batch.sql');
} catch (e) { }

console.log("Done seeding D1!");
