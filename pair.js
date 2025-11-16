import express from 'express';
import fs from 'fs';
import { exec } from 'child_process';
import pino from 'pino';
import {
    makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} from '@whiskeysockets/baileys';
import { upload } from './mega.js';

const router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/pair', async (req, res) => {
    let num = req.query.number;
    async function SAVY_DNI_PAIR() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let SAVY_DNI_Web = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!SAVY_DNI_Web.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await SAVY_DNI_Web.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            SAVY_DNI_Web.ev.on('creds.update', saveCreds);
            SAVY_DNI_Web.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);
                        const sessionData = fs.readFileSync('./session/creds.json');

                        const auth_path = './session/';
                        const user_jid = jidNormalizedUser(SAVY_DNI_Web.user.id);

                        // ONLY CHANGE: Use folder structure instead of random ID
                        const userFolder = SAVY_DNI_Web.user.id.split('@')[0]; // "1234567890"
                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${userFolder}/creds.json`);

                        const string_session = userFolder; // Now it's the phone number

                        const sid = "savy_dni~" + string_session;

                        // Send session ID to user
                        const dt = await SAVY_DNI_Web.sendMessage(user_jid, {
                            text: sid
                        });

                        // Send instructions
                        const desc = `*Hey there, Savy DNI User!* 👋🏻

Thanks for using *Savy DNI* — your session has been successfully created!

🔐 *Session ID:* ${string_session}
⚠️ *Keep it safe!* Do NOT share this ID with anyone.

——————

*🤖 How to use:*
Set this in your environment variables:
SESSION_ID=${string_session}

*📢 Support Channel:*
https://t.me/savydnisupport

*📧 Support Email:*
incoming+ynwghosted-savy-x-pair-code-76096175-issue-@incoming.gitlab.com

——————

> *© Powered by Savy DNI*
Stay secure and enjoy! ✌🏻`;

                        await SAVY_DNI_Web.sendMessage(user_jid, {
                            text: desc,
                            contextInfo: {
                                externalAdReply: {
                                    title: "savy-dni-bot",
                                    thumbnailUrl: "https://i.postimg.cc/Z5H73X1Q/Copilot-20251029-083045.png",
                                    sourceUrl: "https://t.me/savydnisupport",
                                    mediaType: 1,
                                    renderLargerThumbnail: true
                                }  
                            }
                        }, { quoted: dt });

                    } catch (e) {
                        console.error('Error:', e);
                        // exec('pm2 restart savy-dni');
                    }

                    await delay(100);
                    await removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    SAVY_DNI_PAIR();
                }
            });
        } catch (err) {
            console.error('Service error:', err);
            // exec('pm2 restart savy-dni');
            await removeFile('./session');
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }
    return await SAVY_DNI_PAIR();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    // exec('pm2 restart savy-dni');
});

export default router;