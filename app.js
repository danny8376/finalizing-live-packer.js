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

function appendGM9(archive, agent, url) {
    https.get(url, { agent }, (res) => {
        res.pipe(unzipper.Parse())
            .on('entry', (entry) => {
                switch (entry.path.toLowerCase()) {
                    case "GodMode9.firm".toLowerCase():
                        archive.append(entry, { name: "luma/payloads/GodMode9.firm" });
                        break;
                    case "gm9/scripts/GM9Megascript.gm9".toLowerCase():
                        archive.append(entry, { name: "finalize/GM9Megascript.gm9" });
                        break;
                    default:
                        entry.autodrain();
                }
            });
    });
    return archiveAwait(archive, ["luma/payloads/GodMode9.firm", "finalize/GM9Megascript.gm9"]);
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
    await appendGM9(archive, agent, "https://github.com/d0k3/GodMode9/releases/download/v2.1.1/GodMode9-v2.1.1-20220322194259.zip");
    await appendUrl(archive, agent, "gm9/scripts/finalize.gm9", "https://raw.githubusercontent.com/Gruetzig/finalizing-script/main/script/finalize.gm9");
    await appendUrl(archive, agent, "finalize/Anemone3DS.cia", "https://github.com/astronautlevel2/Anemone3DS/releases/latest/download/Anemone3DS.cia");
    await appendUrl(archive, agent, "finalize/Checkpoint.cia", "https://github.com/BernardoGiordano/Checkpoint/releases/download/v3.7.4/Checkpoint.cia");
    await appendUrl(archive, agent, "finalize/Homebrew_Launcher.cia", "https://github.com/PabloMK7/homebrew_launcher_dummy/releases/latest/download/Homebrew_Launcher.cia");
    await appendUrl(archive, agent, "finalize/FBI.cia", "https://github.com/Steveice10/FBI/releases/latest/download/FBI.cia");
    await appendUrl(archive, agent, "finalize/ftpd.cia", "https://github.com/mtheall/ftpd/releases/latest/download/ftpd.cia");
    await appendUrl(archive, agent, "finalize/Universal-Updater.cia", "https://github.com/Universal-Team/Universal-Updater/releases/latest/download/Universal-Updater.cia");
    archive.finalize();
})

app.get('/', (req, res) => {
    res.redirect("https://3ds.hacks.guide");
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})
