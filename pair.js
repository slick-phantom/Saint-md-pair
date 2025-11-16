// pair.js - Updated with KnightBot style connection handling
import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { 
    default as makeWASocket,
    useMultiFileAuthState,
    delay,
    Browsers,
    makeCacheableSignalKeyStore,
    jidNormalizedUser,
    fetchLatestBaileysVersion 
} from '@whiskeysockets/baileys';
import { upload } from './mega.js';

const router = express.Router();

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/pair', async (req, res) => {
    let num = req.query.number;
    const dirs = './session';
    
    // Clean phone number
    num = num.replace(/[^0-9]/g, '');

    async function SAVY_DNI_PAIR() {
        // Remove existing session first
        await removeFile(dirs);
        
        const { state, saveCreds } = await useMultiFileAuthState(dirs);
        
        try {
            const { version } = await fetchLatestBaileysVersion();
            
            let KnightBot = makeWASocket({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Chrome'),
                markOnlineOnConnect: false,
                generateHighQualityLinkPreview: false,
                defaultQueryTimeoutMs: 60000,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000,
                retryRequestDelayMs: 250,
                maxRetries: 5,
            });

            KnightBot.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, isNewLogin } = update;

                if (connection === 'open') {
                    console.log("✅ Connected successfully!");
                    
                    try {
                        // Upload to MEGA with folder structure
                        const userFolder = KnightBot.user.id.split('@')[0];
                        const mega_url = await upload(
                            fs.createReadStream(dirs + '/creds.json'), 
                            `${userFolder}/creds.json`
                        );

                        const session_id = userFolder;
                        const session_message = "savy_dni~" + session_id;

                        // Send to user
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        await KnightBot.sendMessage(userJid, { text: session_message });
                        
                        // Send instructions
                        const desc = `*Hey there, Savy DNI User!* 👋🏻

Thanks for using *Savy DNI* — your session has been successfully created!

🔐 *Session ID:* ${session_id}
⚠️ *Keep it safe!* Do NOT share this ID with anyone.

——————

*🤖 How to use:*
Set this in your environment variables:
SESSION_ID=${session_id}

*📢 Support Channel:*
https://t.me/savydnisupport

——————

> *© Powered by Savy DNI*`;

                        await KnightBot.sendMessage(userJid, { text: desc });

                        // Clean up
                        await delay(1000);
                        removeFile(dirs);
                        console.log("✅ Session completed successfully!");

                    } catch (error) {
                        console.error("❌ Error:", error);
                        removeFile(dirs);
                    }
                }

                if (isNewLogin) {
                    console.log("🔐 New login via pair code");
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    
                    if (statusCode === 401) {
                        console.log("❌ Logged out from WhatsApp");
                    } else {
                        console.log("🔁 Connection closed — restarting...");
                        SAVY_DNI_PAIR();
                    }
                }
            });

            if (!KnightBot.authState.creds.registered) {
                await delay(3000);
                
                try {
                    let code = await KnightBot.requestPairingCode(num);
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    
                    if (!res.headersSent) {
                        await res.send({ code });
                    }
                } catch (error) {
                    console.error('Error requesting pairing code:', error);
                    if (!res.headersSent) {
                        res.status(503).send({ code: 'Failed to get pairing code' });
                    }
                }
            }

            KnightBot.ev.on('creds.update', saveCreds);
            
        } catch (err) {
            console.error('Error initializing session:', err);
            await removeFile(dirs);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }

    await SAVY_DNI_PAIR();
});

export default router;