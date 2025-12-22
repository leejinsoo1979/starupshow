const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

exports.default = async function (context) {
    // context.appOutDir is the path of the packaged application directory
    // context.packager.platform.buildConfigurationKey tells us the platform (mac, win, etc.)

    const platform = context.packager.platform.name;
    let serverDest = '';

    if (platform === 'mac') {
        serverDest = path.join(context.appOutDir, 'GlowUS.app/Contents/Resources/server');
    } else if (platform === 'windows') {
        serverDest = path.join(context.appOutDir, 'resources/server');
    } else {
        // Linux logic if needed, usually resources/server
        serverDest = path.join(context.appOutDir, 'resources/server');
    }

    const srcNodeModules = path.join(context.packager.projectDir, '.next/standalone/node_modules');

    console.log(`[afterPack] Checking source node_modules at: ${srcNodeModules}`);

    if (fs.existsSync(srcNodeModules)) {
        const destNodeModules = path.join(serverDest, 'node_modules');
        console.log(`[afterPack] Manually copying node_modules to: ${destNodeModules}`);

        // Ensure parent dir exists
        if (!fs.existsSync(serverDest)) {
            console.log(`[afterPack] Warning: server directory ${serverDest} does not exist yet. Creating it.`);
            fs.mkdirSync(serverDest, { recursive: true });
        }

        try {
            // Use cp -R for speed and simplicity on unix-like systems
            // Windows might need different handling, but we are on Mac.
            if (process.platform === 'win32') {
                // quick recursive copy for win32 if needed
                // but user is on Mac.
                execSync(`xcopy "${srcNodeModules}" "${destNodeModules}" /E /I /H /Y`);
            } else {
                execSync(`cp -R "${srcNodeModules}" "${destNodeModules}"`);
            }
            console.log('[afterPack] Copy complete.');
        } catch (err) {
            console.error('[afterPack] Failed to copy node_modules:', err);
            throw err;
        }
    } else {
        console.warn('[afterPack] Source node_modules not found!');
    }
}
