const archiver = require('archiver');
const express = require('express');
const { https } = require('follow-redirects');
const unzipper = require('unzipper');

const app = express();
const port = 12345;

function archiveAwait(archive, fns) {
    if (Array.isArray(fns)) {
        return Promise.all(fns.map(fn => archiveAwait(archive, fn)));
    } else {
        return new Promise((resolve, reject) => {
            const cb = ({ name }) => {
                if (name === fns) {
                    resolve();
                } else {
                    archive.once('entry', cb);
                }
            };
            archive.once('entry', cb);
        });
    }
}

function appendZipRemap(archive, agent, url, mapping, ci) { // ci => case insensitive
    const fns = Object.values(mapping);
    if (ci) {
        Object.entries(mapping).forEach(([k, v]) => {
            mapping[ktoLowerCase()] = v;
        });
    }
    https.get(url, { agent }, (res) => {
        res.pipe(unzipper.Parse())
            .on('entry', (entry) => {
                const name = mapping[ci ? entry.path.toLowerCase() : entry.path];
                if (name) {
                    archive.append(entry, { name });
                } else {
                    entry.autodrain();
                }
            });
    });
    return archiveAwait(archive, fns);
}

function appendUrl(archive, agent, fn, url) {
    https.get(url, { agent }, (res) => {
        archive.append(res, { name: fn });
    });
    return archiveAwait(archive, fn);
}

app.get('/finalize', async (req, res) => {
    const agent = new https.Agent({
        keepAlive: true,
        maxSockets: 2
    });
    const archive = archiver('zip');
    archive.pipe(res);
    const files = [];
    files.push(appendZipRemap(archive, agent, "https://github.com/d0k3/GodMode9/releases/download/v2.1.1/GodMode9-v2.1.1-20220322194259.zip", {
        "GodMode9.firm": "luma/payloads/GodMode9.firm",
        "gm9/scripts/GM9Megascript.gm9": "finalize/GM9Megascript.gm9"
    }));
    files.push(appendUrl(archive, agent, "gm9/scripts/finalize.gm9", "https://raw.githubusercontent.com/Gruetzig/finalizing-script/main/script/finalize.gm9"));
    files.push(appendUrl(archive, agent, "finalize/Anemone3DS.cia", "https://github.com/astronautlevel2/Anemone3DS/releases/latest/download/Anemone3DS.cia"));
    files.push(appendUrl(archive, agent, "finalize/Checkpoint.cia", "https://github.com/BernardoGiordano/Checkpoint/releases/download/v3.7.4/Checkpoint.cia"));
    files.push(appendUrl(archive, agent, "finalize/Homebrew_Launcher.cia", "https://github.com/PabloMK7/homebrew_launcher_dummy/releases/latest/download/Homebrew_Launcher.cia"));
    files.push(appendUrl(archive, agent, "finalize/FBI.cia", "https://github.com/Steveice10/FBI/releases/latest/download/FBI.cia"));
    files.push(appendUrl(archive, agent, "finalize/ftpd.cia", "https://github.com/mtheall/ftpd/releases/latest/download/ftpd.cia"));
    files.push(appendUrl(archive, agent, "finalize/Universal-Updater.cia", "https://github.com/Universal-Team/Universal-Updater/releases/latest/download/Universal-Updater.cia"));
    await Promise.all(files);
    archive.finalize();
})

app.get('/', (req, res) => {
    res.redirect("https://3ds.hacks.guide");
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})
