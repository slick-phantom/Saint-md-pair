import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from 'sdnight';
import SupabaseSessionStore from './supabase.js'; // Switched from redis.js to supabase.js

const router = express.Router();

// Generate unique session ID - Changed default brand to SAINT
function generateSessionId(brand = 'SAIN') {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 6);
    return `${brand}~${timestamp}${random}`;
}

// Ensure the session directory exists
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

// Upload session to Supabase - Updated from Redis logic
async function uploadSessionToSupabase(sessionId, dirs) {
    try {
        const credsPath = `${dirs}/creds.json`;
        if (fs.existsSync(credsPath)) {
            const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            // Using the saveCreds method from your new Supabase store
            await SupabaseSessionStore.saveCreds(sessionId, credsData);
            console.log(`📤 Session uploaded to Supabase: ${sessionId}`);
            return true;
        }
    } catch (error) {
        console.error('❌ Failed to upload session to Supabase:', error);
    }
    return false;
}

router.get('/pair', async (req, res) => {
    let num = req.query.number;
    const brand = 'SAIN'; // Changed from SAVY to SAINT
    
    // Generate unique session ID
    const sessionId = generateSessionId(brand);
    const dirs = `./sessions/${sessionId}`; 

    // Create session directory
    if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions', { recursive: true });
    }
    if (!fs.existsSync(dirs)) {
        fs.mkdirSync(dirs, { recursive: true });
    }

    // Remove existing session if present
    await removeFile(dirs);

    // Clean the phone number
    num = num.replace(/[^0-9]/g, '');

    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            const { version, isLatest } = await fetchLatestBaileysVersion();
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
                const { connection, lastDisconnect, isNewLogin, isOnline } = update;

                if (connection === 'open') {
                    console.log("✅ Connected successfully!");
                    console.log(`📁 Session ID: ${sessionId}`);
                    console.log("📱 Sending session file to user...");
                    
                    try {
                        const sessionKnight = fs.readFileSync(dirs + '/creds.json');

                        // Upload session to Supabase
                        const supabaseSuccess = await uploadSessionToSupabase(sessionId, dirs);

                        // Send session file to user
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        await KnightBot.sendMessage(userJid, {
                            document: sessionKnight,
                            mimetype: 'application/json',
                            fileName: `${sessionId}_creds.json`
                        });
                        console.log("📄 Session file sent successfully");

                        // Send session info with Supabase status
                        let sessionInfo = `🔐 *Session Created Successfully!*\n\n` +
                                         `📁 Session ID: ${sessionId}\n` +
                                         `📞 Linked to: ${num}\n` +
                                         `⏰ Created: ${new Date().toLocaleString()}\n\n` +
                                         `⚠️ *Important:* Keep your session ID safe!\n` +
                                         `Use it to restore your session later.`;

                        if (supabaseSuccess) {
                            sessionInfo += `\n\n💾 *Cloud Backup:* Stored in Supabase (Session ID: ${sessionId})`;
                        } else {
                            sessionInfo += `\n\n❌ *Cloud Backup:* Failed - using local file only`;
                        }

                        await KnightBot.sendMessage(userJid, {
                            text: sessionInfo
                        });

                        // Send video thumbnail with updated SAINT caption
                        await KnightBot.sendMessage(userJid, {
                            image: { url: 'https://i.postimg.cc/Z5H73X1Q/Copilot-20251029-083045.png' },
                            caption: `🎬 * SAINT MD X V2.0 Full Setup Guide!*\n\n🚀 Bug Fixes + New Commands + Fast AI Chat\n📺 JOIN Now: https://t.me/saintmdsupport`
                        });
                        console.log("🎬 Video guide sent successfully");

                        // Send warning message - Changed savy to saint
                        await KnightBot.sendMessage(userJid, {
                            text: `⚠️ Do not share your session ID or creds file with anybody! ⚠️\n 
┌┤✑  Thanks for using SAINT MD X Bot
│└────────────┈ ⳹         
│©2024 DARK SNIPER 
| 🪪SESSION ID : ${sessionId}
└─────────────────┈ ⳹\n\n`
                        });
                        console.log("⚠️ Warning message sent successfully");

                        // Clean up
                        console.log("🧹 Cleaning up local session...");
                        await delay(1000);
                        removeFile(dirs);
                        console.log("✅ Local session cleaned up successfully");
                        console.log("🎉 Process completed successfully!");
                        
                    } catch (error) {
                        console.error("❌ Error sending messages:", error);
                        removeFile(dirs);
                    }
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode === 401) {
                        console.log("❌ Logged out from WhatsApp. Need to generate new pair code.");
                    } else {
                        console.log("🔁 Connection closed — restarting...");
                        initiateSession();
                    }
                }
            });

            if (!KnightBot.authState.creds.registered) {
                await delay(3000); 
                num = num.replace(/[^\d+]/g, '');
                if (num.startsWith('+')) num = num.substring(1);

                try {
                    let code = await KnightBot.requestPairingCode(num, { brand: brand });
                    code = code?.match(/.{1,4}/g)?.join('-') || code;
                    if (!res.headersSent) {
                        console.log({ 
                            sessionId: sessionId,
                            phone: num, 
                            code: code,
                            brand: brand 
                        });
                        await res.send({ 
                            sessionId: sessionId,
                            code: code,
                            brand: brand,
                            message: `Use this pairing code with session ID: ${sessionId}`
                        });
                    }
                } catch (error) {
                    console.error('Error requesting pairing code:', error);
                    if (!res.headersSent) {
                        res.status(503).send({ code: 'Failed to get pairing code.' });
                    }
                }
            }

            KnightBot.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
            removeFile(dirs);
        }
    }

    await initiateSession();
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict") || e.includes("not-authorized") || e.includes("Socket connection timeout")) return;
    console.log('Caught exception: ', err);
});

export default router;
