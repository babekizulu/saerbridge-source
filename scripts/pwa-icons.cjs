const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../server/node_modules/sharp');
const root = path.join(__dirname, '..', 'client', 'public');
const mark = fs.readFileSync(path.join(root, 'favicon.svg'), 'utf8').replace('<svg ', '<svg x="102" y="102" ').replace('width="60" height="60"', 'width="308" height="308"').replaceAll('#2D2D2D', '#f4f6f2');
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#243c32"/>${mark}</svg>`);
fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
Promise.all([192, 512].map((size) => sharp(svg).resize(size, size).png().toFile(path.join(root, 'icons', `icon-${size}.png`))))
    .then(() => fs.copyFileSync(path.join(root, 'icons', 'icon-512.png'), path.join(root, 'icons', 'maskable-512.png')));
