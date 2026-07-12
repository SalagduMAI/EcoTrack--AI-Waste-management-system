const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;
const AUTH_DIR = path.join(__dirname, 'auth_info_baileys');

let sock = null;
let connectionStatus = 'connecting'; // 'connecting', 'qr', 'connected'
let currentQr = null;

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            connectionStatus = 'qr';
            try {
                currentQr = await QRCode.toDataURL(qr);
            } catch (err) {
                console.error('Failed to generate QR DataURL:', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
            connectionStatus = 'connecting';
            currentQr = null;
            if (shouldReconnect) {
                setTimeout(startWhatsApp, 3000);
            }
        } else if (connection === 'open') {
            console.log('WhatsApp connection opened successfully!');
            connectionStatus = 'connected';
            currentQr = null;
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

// Start connection
startWhatsApp();

// API Endpoints
app.get('/status', (req, res) => {
    res.json({
        status: connectionStatus,
        qr: currentQr
    });
});

app.post('/send', async (req, res) => {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required.' });
    }

    if (connectionStatus !== 'connected') {
        return res.status(503).json({ error: 'WhatsApp gateway is not connected. Please scan the QR code.' });
    }

    try {
        // Format phone: remove non-digits
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        
        // Ensure country code: if starts with 0, convert to Sri Lanka format
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '94' + cleanPhone.substring(1);
        } else if (!cleanPhone.startsWith('94') && cleanPhone.length === 9) {
            cleanPhone = '94' + cleanPhone;
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;
        
        // Send message
        await sock.sendMessage(jid, { text: message });
        
        console.log(`Successfully sent message to ${jid}`);
        res.json({ success: true, message: `Message sent to ${phone}` });
    } catch (err) {
        console.error('Failed to send message:', err);
        res.status(500).json({ error: 'Failed to send message: ' + err.message });
    }
});

app.post('/logout', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
        }
        connectionStatus = 'connecting';
        currentQr = null;
        
        // Clean auth dir
        if (fs.existsSync(AUTH_DIR)) {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        
        // Restart connection to generate new QR code
        setTimeout(startWhatsApp, 2000);
        
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        console.error('Failed to logout:', err);
        res.status(500).json({ error: 'Failed to logout: ' + err.message });
    }
});

app.listen(PORT, () => {
    console.log(`WhatsApp Gateway Service listening on port ${PORT}`);
});
