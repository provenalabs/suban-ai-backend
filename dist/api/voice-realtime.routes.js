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
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const rateLimit_middleware_1 = require("../middleware/rateLimit.middleware");
const grok_voice_service_1 = __importDefault(require("../services/grok-voice.service"));
const balance_tracker_service_1 = __importDefault(require("../services/solana/balance-tracker.service"));
const price_oracle_service_1 = __importDefault(require("../services/solana/price-oracle.service"));
const router = (0, express_1.Router)();
/**
 * POST /api/voice/realtime/session
 * Create a new Grok Voice Agent session
 */
router.post('/session', rateLimit_middleware_1.voiceRateLimiter, auth_middleware_1.verifyWallet, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { walletAddress, userId, voice, model, systemInstructions } = req.body;
        const userWallet = walletAddress || req.walletAddress;
        const userIdentifier = userId || userWallet;
        if (!grok_voice_service_1.default.isAvailable()) {
            return res.status(503).json({ error: 'Grok Voice Agent service not configured' });
        }
        // Estimate cost for voice session (rough estimate)
        const estimatedCost = 0.10; // $0.10 per session estimate
        const requiredTokens = price_oracle_service_1.default.calculateTokenBurn(estimatedCost);
        // Check balance
        const hasSufficientBalance = yield balance_tracker_service_1.default.hasSufficientBalance(userWallet, requiredTokens);
        if (!hasSufficientBalance) {
            const balance = yield balance_tracker_service_1.default.getBalance(userWallet);
            return res.status(402).json({
                error: 'Insufficient tokens',
                required: requiredTokens,
                available: balance.currentBalance,
                costUsd: estimatedCost,
            });
        }
        // Create voice session
        const session = yield grok_voice_service_1.default.createSession({
            model: model || 'grok-4-1-fast-non-reasoning',
            voice: voice || 'Ara',
            systemInstructions: systemInstructions || '',
        });
        res.json({
            sessionId: session.sessionId,
            message: 'Voice session created. Connect via WebSocket to /api/voice/realtime/ws/:sessionId',
            wsUrl: `/api/voice/realtime/ws/${session.sessionId}`,
        });
    }
    catch (error) {
        console.error('Voice session creation error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
}));
/**
 * GET /api/voice/realtime/session/:sessionId
 * Get session information
 */
router.get('/session/:sessionId', auth_middleware_1.verifyWallet, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const session = grok_voice_service_1.default.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        res.json({
            sessionId: session.sessionId,
            isConnected: session.isConnected,
            duration: session.duration,
            startTime: session.startTime,
        });
    }
    catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
}));
/**
 * DELETE /api/voice/realtime/session/:sessionId
 * Close a voice session
 */
router.delete('/session/:sessionId', auth_middleware_1.verifyWallet, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId } = req.params;
        const session = grok_voice_service_1.default.getSession(sessionId);
        if (!session) {
            return res.status(404).json({ error: 'Session not found' });
        }
        yield session.close();
        res.json({
            message: 'Session closed',
            sessionId,
            duration: session.duration,
        });
    }
    catch (error) {
        console.error('Close session error:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
}));
exports.default = router;
// Note: WebSocket endpoint would be handled separately in the main server file
// This would typically be set up with express-ws or similar:
// 
// import expressWs from 'express-ws';
// const { app } = expressWs(express());
// 
// app.ws('/api/voice/realtime/ws/:sessionId', async (ws, req) => {
//     const { sessionId } = req.params;
//     const session = grokVoiceService.getSession(sessionId);
//     
//     if (!session) {
//         ws.close(1008, 'Session not found');
//         return;
//     }
//     
//     // Forward WebSocket messages between client and Grok Voice Agent
//     session.on('audio', (audioBuffer) => {
//         ws.send(JSON.stringify({ type: 'audio', data: audioBuffer.toString('base64') }));
//     });
//     
//     session.on('transcript', (text) => {
//         ws.send(JSON.stringify({ type: 'transcript', text }));
//     });
//     
//     ws.on('message', (message) => {
//         try {
//             const data = JSON.parse(message.toString());
//             if (data.type === 'audio') {
//                 session.sendAudio(Buffer.from(data.data, 'base64'));
//             } else if (data.type === 'text') {
//                 session.sendText(data.text);
//             }
//         } catch (error) {
//             console.error('WebSocket message error:', error);
//         }
//     });
//     
//     ws.on('close', () => {
//         session.close().catch(console.error);
//     });
// });
