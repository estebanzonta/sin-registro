import { removeBackground } from '@imgly/background-removal-node';
import fs from 'fs';
import path from 'path';

async function processImages() {
    const dir = './public';
    const files = fs.readdirSync(dir).filter(f => f.startsWith('model-') && f.endsWith('.png'));

    for (const file of files) {
        const inputPath = path.join(dir, file);
        const tempPath = inputPath + '.tmp';

        // Copy to temp file to read from, then remove background and overwrite original
        fs.copyFileSync(inputPath, tempPath);

        console.log(`Processing ${inputPath}...`);
        try {
            const blob = await removeBackground(tempPath);
            const buffer = Buffer.from(await blob.arrayBuffer());
            fs.writeFileSync(inputPath, buffer);
            console.log(`Success: ${inputPath}`);
        } catch (e) {
            console.error(`Failed on ${inputPath}:`, e);
        }
        fs.unlinkSync(tempPath);
    }
}

processImages();
