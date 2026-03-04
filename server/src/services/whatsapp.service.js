const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  fetchLatestBaileysVersion,
} = require("baileys");
const QRCode = require("qrcode");
const fs = require("fs");
const path = require("path");
const WhatsAppLog = require("../models/WhatsAppLog");
const logger = require("../utils/logger");

const AUTH_DIR =
  process.env.WHATSAPP_AUTH_DIR || path.join(__dirname, "../../whatsapp_auth");
const RATE_LIMIT_MS = 2000; // 2 seconds between messages (30/min)

class WhatsAppService {
  constructor() {
    this.sock = null;
    this.isConnected = false;
    this.qrCodeStr = null;
    this.messageQueue = [];
    this.isProcessingQueue = false;
    this.lastSentTime = 0;
  }

  /**
   * Initialize Baileys socket connection.
   */
  async initialize() {
    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { version, isLatest } = await fetchLatestBaileysVersion();
      logger.info(
        `[WhatsApp] Using Baileys version: ${version} (Latest: ${isLatest})`,
      );

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.retryCache = this.retryCache || {};
      const msgRetryCounterCache = {
        get: (key) => this.retryCache[key],
        set: (key, value) => {
          this.retryCache[key] = value;
        },
      };

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // We'll render it in the admin panel
        logger: require("pino")({ level: "silent" }), // Hide baileys noisy logs
        browser: Browsers.macOS("Desktop"),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        msgRetryCounterCache,
        version,
      });

      this.sock.ev.on("creds.update", saveCreds);

      this.sock.ev.on("connection.update", async (update) => {
        logger.info(`[WhatsApp] Connection update: ${JSON.stringify(update)}`);
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generate QR code data URL for frontend to render
          this.qrCodeStr = await QRCode.toDataURL(qr);
          logger.info("[WhatsApp] New QR code generated");
        }

        if (connection === "close") {
          this.isConnected = false;
          // Clear QR code if connection is closed and not expecting a new one right away
          const shouldReconnect =
            lastDisconnect?.error?.output?.statusCode !==
            DisconnectReason.loggedOut;

          logger.error(
            `[WhatsApp] Connection closed due to: ${lastDisconnect?.error?.message || "Unknown error"}. Reconnecting: ${shouldReconnect}`,
          );

          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 5000); // 5 sec delay before reconnect
          } else {
            // Logged out manually, clear auth dir
            this.qrCodeStr = null; // Next init will generate new QR
            this._clearAuthDir();
            logger.info("[WhatsApp] User logged out. Waiting for new scan.");
            setTimeout(() => this.initialize(), 2000);
          }
        } else if (connection === "open") {
          this.isConnected = true;
          this.qrCodeStr = null; // Clear QR code as we are connected
          logger.info("[WhatsApp] Connected successfully!");
        }
      });
    } catch (error) {
      logger.error("[WhatsApp] Failed to initialize:", error);
    }
  }

  /**
   * Helper to clear auth directory upon logout or forced reconnect
   */
  _clearAuthDir() {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  }

  /**
   * Force reconnect. Deletes existing auth state and restarts.
   */
  async reconnect() {
    if (this.sock) {
      this.sock.ws.close();
    }
    this.isConnected = false;
    this._clearAuthDir();
    await this.initialize();
  }

  /**
   * Get current connection status and QR code string.
   */
  getStatus() {
    return {
      connected: this.isConnected,
      qrCodeStr: this.qrCodeStr,
      queueLength: this.messageQueue.length,
    };
  }

  /**
   * Queue a message to be sent.
   * Creates a WhatsAppLog document immediately with 'pending' status.
   */
  async queueMessage({ recipientId, recipientNumber, type, message }) {
    try {
      const log = await WhatsAppLog.create({
        recipientId,
        recipientNumber,
        notificationType: type,
        message,
        status: "pending",
      });

      this.messageQueue.push({
        logId: log._id,
        recipientNumber,
        message,
        attempts: 0,
      });

      if (!this.isProcessingQueue) {
        this.processQueue();
      }

      return log;
    } catch (error) {
      logger.error("[WhatsApp] Failed to queue message:", error);
      return null;
    }
  }

  /**
   * Process the message queue with rate limiting and exponential backoff.
   */
  async processQueue() {
    if (this.messageQueue.length === 0) {
      this.isProcessingQueue = false;
      return;
    }

    this.isProcessingQueue = true;

    // Wait for rate limit delay
    const now = Date.now();
    const timeSinceLastSend = now - this.lastSentTime;
    if (timeSinceLastSend < RATE_LIMIT_MS) {
      const delayMs = RATE_LIMIT_MS - timeSinceLastSend;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const item = this.messageQueue[0];
    const { logId, recipientNumber, message, attempts } = item;

    try {
      if (!this.isConnected || !this.sock) {
        throw new Error("WhatsApp is not connected");
      }

      // Format number: e.g. 0812... -> 62812... -> 62812...@s.whatsapp.net
      let formattedNumber = recipientNumber.replace(/\D/g, "");
      if (formattedNumber.startsWith("0")) {
        formattedNumber = "62" + formattedNumber.substring(1);
      }
      const jid = `${formattedNumber}@s.whatsapp.net`;

      // Check if number exists on WA (optional, but good practice to avoid generic errors)
      const [result] = await this.sock.onWhatsApp(jid);
      if (!result || !result.exists) {
        throw new Error("Number is not registered on WhatsApp");
      }

      await this.sock.sendMessage(jid, { text: message });
      this.lastSentTime = Date.now();

      // Success
      await WhatsAppLog.findByIdAndUpdate(logId, {
        status: "sent",
        sentAt: new Date(),
        attempts: attempts + 1,
        lastAttemptAt: new Date(),
      });

      // Remove from queue
      this.messageQueue.shift();
    } catch (error) {
      logger.error(
        `[WhatsApp] Failed to send message to ${recipientNumber}:`,
        error,
      );

      const newAttempts = attempts + 1;
      const MAX_ATTEMPTS = 3;

      if (newAttempts >= MAX_ATTEMPTS) {
        // Drop it
        await WhatsAppLog.findByIdAndUpdate(logId, {
          status: "failed",
          error: error.message,
          attempts: newAttempts,
          lastAttemptAt: new Date(),
        });
        this.messageQueue.shift();
      } else {
        // Update attempt count and put back in queue, BUT apply backoff
        await WhatsAppLog.findByIdAndUpdate(logId, {
          error: error.message,
          attempts: newAttempts,
          lastAttemptAt: new Date(),
        });

        // Remove from front, put at back to process other messages
        const failedItem = this.messageQueue.shift();
        failedItem.attempts = newAttempts;
        this.messageQueue.push(failedItem);

        // Add artificial delay before processing next item to prevent spamming failed attempts
        const backoffMs = Math.pow(2, newAttempts) * 1000; // 2s, 4s, etc
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    // Process next
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * Fetch recent logs for admin panel
   */
  async getRecentLogs(limit = 50, skip = 0) {
    const logs = await WhatsAppLog.find()
      .populate("recipientId", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WhatsAppLog.countDocuments();

    return { logs, total };
  }
}

module.exports = new WhatsAppService();
