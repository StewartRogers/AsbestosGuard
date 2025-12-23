import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
// Load local env to pick up AZURE_STORAGE_CONNECTION_STRING etc.
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
(async function main() {
    try {
        const svc = await import('../services/azureBlobStorageService.js');
        const dataDir = path.resolve(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            console.error('No data directory found at', dataDir);
            process.exit(1);
        }
        const folders = ['applications', 'fact-sheets', 'analysis'];
        for (const folder of folders) {
            const srcDir = path.join(dataDir, folder);
            if (!fs.existsSync(srcDir)) {
                console.log(`Skipping ${folder} (no local folder)`);
                continue;
            }
            const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.json'));
            console.log(`Uploading ${files.length} files from ${srcDir} => container: ${folder}`);
            for (const file of files) {
                const full = path.join(srcDir, file);
                const content = JSON.parse(fs.readFileSync(full, 'utf8'));
                const name = file.replace(/\.json$/, '');
                try {
                    if (folder === 'applications')
                        await svc.saveApplication(name, content);
                    else if (folder === 'fact-sheets')
                        await svc.saveFactSheet(name, content);
                    else if (folder === 'analysis')
                        await svc.saveAnalysis(name, content);
                    console.log(`  ✓ uploaded ${file}`);
                }
                catch (err) {
                    console.error(`  ✗ failed ${file}:`, err?.message || err);
                }
            }
        }
        console.log('Migration complete. Verify in Azure Portal or Storage Explorer.');
    }
    catch (err) {
        console.error('Migration script failed:', err);
        process.exit(1);
    }
})();
