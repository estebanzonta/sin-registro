import { removeBackground } from '@imgly/background-removal-node';
import fs from 'fs';
import path from 'path';

async function processImage(filename) {
    const dir = './public';
    const inputPath = path.join(dir, filename);
    const tempPath = inputPath + '.tmp';

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

async function run() {
    await processImage('tshirt-white-front.png');
    await processImage('tshirt-white-back.png');
    await processImage('tshirt-black-front.png');
    await processImage('tshirt-black-back.png');
    console.log("Done extracting backgrounds!");
}
run();
