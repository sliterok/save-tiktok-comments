import fs from 'fs';
import path from 'path';
import Zip from 'zip-stream';

const MANIFEST_PATH = 'manifest.json';
const PACKAGE_JSON_PATH = 'package.json';
const ICONS = ['icon.png'];
const DIST_DIR = 'dist';
const POPUP_HTML = 'popup.html';

function getProjectVersion() {
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    return packageJson.version;
}

async function createZip(version) {
    const zipFileName = `tiktok-comments-ext-v${version}.zip`;
    const output = fs.createWriteStream(zipFileName);
    const archive = new Zip();

    archive.pipe(output);

    const filesToInclude = [
        MANIFEST_PATH,
        POPUP_HTML,
        ...ICONS.filter(icon => fs.existsSync(icon)),
        ...fs.readdirSync(DIST_DIR).map(file => path.join(DIST_DIR, file))
    ];

    const addFileToZip = (file) => {
        return new Promise((resolve, reject) => {
            archive.entry(fs.createReadStream(file), { name: file }, (err) => {
                if (err) return reject(err);
                resolve();
            });
        });
    };

    for(const file of filesToInclude) {
        await addFileToZip(file)
    }

    archive.finalize();
    console.log(`Successfully created ${zipFileName}`);
}

const version = getProjectVersion();
createZip(version);