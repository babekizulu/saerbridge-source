const { spawn } = require('child_process');

// Node's built-in certificate list does not include the Windows trust store.
// Without this, OpenAI calls fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
if (!process.execArgv.includes('--use-system-ca')) {
    const child = spawn(process.execPath, [
        '--use-system-ca',
        ...process.execArgv.filter((arg) => !arg.startsWith('--watch')),
        ...process.argv.slice(1),
    ], { stdio: 'inherit', env: process.env });
    const stopChild = () => {
        if (child.exitCode == null && child.signalCode == null) child.kill();
    };
    process.on('SIGINT', stopChild);
    process.on('SIGTERM', stopChild);
    process.on('exit', stopChild);
    child.on('exit', (code) => process.exit(code == null ? 1 : code));
} else {
    start();
}

function start() {
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { createApp } = require('./app');
const { publicKeyInfo } = require('./security/envelope');

const PORT = Number(process.env.PORT) || 3011;
const app = createApp();
const server = app.listen(PORT, () => {
    if (!process.env.OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY is missing. Add it to server/.env');
    }
    const key = publicKeyInfo();
    if (key.source === 'ephemeral' && process.env.NODE_ENV === 'production') {
        console.error('DATA_ENCRYPTION_PRIVATE_KEY is not set. This process is using a temporary key.');
    }
    console.log(`Home design API listening on ${PORT}`);
});

server.requestTimeout = 180000;
server.headersTimeout = 185000;
}
