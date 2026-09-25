import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import type { Plugin } from 'vite';
export function sourcePwa(): Plugin {
    return { name: 'source-pwa', apply: 'build', closeBundle() {
        const dist = resolve('dist');
        const files = readdirSync(dist, { recursive: true, withFileTypes: true }).filter((file) => file.isFile() && !['sw.js', '_headers', '_redirects'].includes(file.name));
        const paths = files.map((file) => resolve(file.parentPath, file.name));
        const version = createHash('sha256');
        paths.forEach((path) => version.update(readFileSync(path)));
        const urls = paths.map((path) => '/' + relative(dist, path).replaceAll('\\', '/'));
        const template = readFileSync(resolve('service-worker.js'), 'utf8');
        writeFileSync(resolve(dist, 'sw.js'), template.replace('__PRECACHE__', JSON.stringify(urls)).replace('__VERSION__', version.digest('hex').slice(0, 12)));
    } };
}
