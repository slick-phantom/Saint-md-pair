import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser, fetchLatestBaileysVersion } from 'sdnight';
import pn from 'awesome-phonenumber';
import { upload, download } from './mega.js'; // Import your mega functions

const router = express.Router();

// Generate unique session ID
function generateSessionId(brand = 'SAVY') {
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

// Upload session to Mega
async function uploadSessionToMega(sessionId, dirs) {
    try {
        const credsPath = `${dirs}/creds.json`;
        if (fs.existsSync(credsPath)) {
            const credsStream = fs.createReadStream(credsPath);
            const megaUrl = await upload(credsStream, `${sessionId}_creds.json`);
            console.log(`📤 Session uploaded to Mega: ${megaUrl}`);
            return megaUrl;
        }
    } catch (error) {
        console.error('❌ Failed to upload session to Mega:', error);
    }
    return null;
}

router.get('/pair', async (req, res) => {
    let num = req.query.number;
    const brand = req.query.brand || 'SAVY';
    
    // Generate unique session ID
    const sessionId = generateSessionId(brand);
    const dirs = `./sessions/${sessionId}`; // Use session ID as folder name

    // Create session directory
    if (!fs.existsSync('./sessions')) {
        fs.mkdirSync('./sessions', { recursive: true });
    }
    if (!fs.existsSync(dirs)) {
        fs.mkdirSync(dirs, { recursive: true });
    }

    // Remove existing session if present
    await removeFile(dirs);

    // Clean the phone number - remove any non-digit characters
    num = num.replace(/[^0-9]/g, '');

    // Validate the phone number using awesome-phonenumber
    const phone = pn('+' + num);
    if (!phone.isValid()) {
        if (!res.headersSent) {
            return res.status(400).send({ 
                code: 'Invalid phone number. Please enter your full international number (e.g., 15551234567 for US, 447911123456 for UK, 84987654321 for Vietnam, etc.) without + or spaces.' 
            });
        }
        return;
    }
    // Use the international number format (E.164, without '+')
    num = phone.getNumber('e164').replace('+', '');

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

                        // Upload session to Mega
                        const megaUrl = await uploadSessionToMega(sessionId, dirs);

                        // Send session file to user
                        const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                        await KnightBot.sendMessage(userJid, {
                            document: sessionKnight,
                            mimetype: 'application/json',
                            fileName: `${sessionId}_creds.json`
                        });
                        console.log("📄 Session file sent successfully");

                        // Send session info with Mega URL if available
                        let sessionInfo = `🔐 *Session Created Successfully!*\n\n` +
                                         `📁 Session ID: ${sessionId}\n` +
                                         `📞 Linked to: ${num}\n` +
                                         `⏰ Created: ${new Date().toLocaleString()}\n\n` +
                                         `⚠️ *Important:* Keep your session ID safe!\n` +
                                         `Use it to restore your session later.`;

                        if (megaUrl) {
                            sessionInfo += `\n\n📤 *Cloud Backup:* ${megaUrl}`;
                        }

                        await KnightBot.sendMessage(userJid, {
                            text: sessionInfo
                        });

                        // Send video thumbnail with caption
                        await KnightBot.sendMessage(userJid, {
                            image: { url: 'https://i.postimg.cc/Z5H73X1Q/Copilot-20251029-083045.png' },
                            caption: `🎬 * SAVY DNI X  V2.0 Full Setup Guide!*\n\n🚀 Bug Fixes + New Commands + Fast AI Chat\n📺 JOIN Now: https://t.me/savydnisupport`
                        });
                        console.log("🎬 Video guide sent successfully");

                        // Send warning message
                        await KnightBot.sendMessage(userJid, {
                            text: `⚠️ Do not share your session ID or creds file with anybody! ⚠️\n 
┌┤✑  Thanks for using savy dni x Bot
│└────────────┈ ⳹        
│©2024 DARK SNIPER 
| 🪪SESSION ID : ${sessionId}
└─────────────────┈ ⳹\n\n`
                        });
                        console.log("⚠️ Warning message sent successfully");

                        // Clean up local session after use (optional - keep if you want local backup)
                        console.log("🧹 Cleaning up local session...");
                        await delay(1000);
                        removeFile(dirs);
                        console.log("✅ Local session cleaned up successfully");
                        console.log("🎉 Process completed successfully!");
                        
                    } catch (error) {
                        console.error("❌ Error sending messages:", error);
                        // Still clean up session even if sending fails
                        removeFile(dirs);
                    }
                }

                if (isNewLogin) {
                    console.log("🔐 New login via pair code");
                }

                if (isOnline) {
                    console.log("📶 Client is online");
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
                await delay(3000); // Wait 3 seconds before requesting pairing code
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
                        res.status(503).send({ code: 'Failed to get pairing code. Please check your phone number and try again.' });
                    }
                }
            }

            KnightBot.ev.on('creds.update', saveCreds);
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
            // Clean up on error
            removeFile(dirs);
        }
    }

    await initiateSession();
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    if (e.includes("Stream Errored")) return;
    if (e.includes("Stream Errored (restart required)")) return;
    if (e.includes("statusCode: 515")) return;
    if (e.includes("statusCode: 503")) return;
    console.log('Caught exception: ', err);
});

export default router;