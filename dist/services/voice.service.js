"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceService = void 0;
const grok_voice_service_1 = __importDefault(require("./grok-voice.service"));
class VoiceService {
    constructor() {
        this.MAX_SESSION_DURATION = 180000; // 3 minutes in milliseconds
        // Service is initialized via constructor
    }
    /**
     * Create a new Grok Voice Agent session
     * This is the primary method for voice interactions
     */
    createSession() {
        return __awaiter(this, arguments, void 0, function* (config = {}) {
            if (!grok_voice_service_1.default.isAvailable()) {
                throw new Error('Grok Voice Agent service not configured. GROK_API_KEY required.');
            }
            return yield grok_voice_service_1.default.createSession(config);
        });
    }
    /**
     * Get active session by ID
     */
    getSession(sessionId) {
        return grok_voice_service_1.default.getSession(sessionId);
    }
    /**
     * Close a voice session
     */
    closeSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const session = grok_voice_service_1.default.getSession(sessionId);
            if (session) {
                yield session.close();
            }
        });
    }
    /**
     * Get session information
     */
    getSessionInfo(sessionId) {
        const session = grok_voice_service_1.default.getSession(sessionId);
        if (!session) {
            return null;
        }
        return {
            sessionId: session.sessionId,
            isConnected: session.isConnected,
            duration: session.duration,
            startTime: session.startTime,
        };
    }
    /**
     * Check if voice service is available
     */
    isAvailable() {
        return grok_voice_service_1.default.isAvailable();
    }
    /**
     * Check session duration
     */
    isSessionValid(sessionId) {
        const session = grok_voice_service_1.default.getSession(sessionId);
        if (!session)
            return false;
        const duration = Date.now() - session.startTime;
        return duration < this.MAX_SESSION_DURATION;
    }
}
exports.voiceService = new VoiceService();
exports.default = exports.voiceService;
