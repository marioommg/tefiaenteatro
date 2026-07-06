
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

async function convertWithSharp(inputDir) {
    const entries = await fs.readdir(inputDir, { withFileTypes: true });

    for (const entry of entries) {
        if (entry.isDirectory()) continue;

        const inputPath = path.join(inputDir, entry.name);
        const ext = path.extname(entry.name).toLowerCase();

        if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
            const outputPath = path.join(inputDir, path.parse(entry.name).name + '.webp');

            try {
                console.log(`Converting ${entry.name}...`);
                await sharp(inputPath)
                    .rotate()
                    .webp({ quality: 85 })
                    .toFile(outputPath);
                console.log(`✔ Created ${outputPath}`);
            } catch (err) {
                console.error(`✖ Failed to convert ${entry.name}:`, err);
            }
        }
    }
}

const inputDir = process.argv[2];
if (!inputDir) {
    console.error("Please provide a directory path");
    process.exit(1);
}

convertWithSharp(inputDir);
