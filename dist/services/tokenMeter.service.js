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
exports.tokenMeterService = void 0;
const usage_model_1 = __importDefault(require("../models/usage.model"));
const costCalculator_1 = require("../utils/costCalculator");
class TokenMeterService {
    /**
     * Record usage for a request
     */
    recordUsage(usage) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const usageRecord = yield usage_model_1.default.create({
                    userId: usage.userId,
                    sessionId: usage.sessionId,
                    type: usage.type,
                    inputTokens: usage.inputTokens,
                    outputTokens: usage.outputTokens,
                    whisperDuration: usage.voiceSessionMinutes ? usage.voiceSessionMinutes * 60 : 0, // Convert to seconds
                    ttsCharacters: 0, // Not used - voice handled by Grok Voice Agent
                    costUSD: usage.costUSD,
                });
                return usageRecord;
            }
            catch (error) {
                throw new Error(`Failed to record usage: ${error.message}`);
            }
        });
    }
    /**
     * Record usage from metrics
     */
    recordUsageFromMetrics(userId, sessionId, type, metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            const costUSD = (0, costCalculator_1.calculateUsageCost)(metrics);
            return this.recordUsage({
                userId,
                sessionId,
                type,
                provider: metrics.provider,
                model: metrics.model || (metrics.provider === 'deepseek' ? 'deepseek-chat' : 'grok-4-1-fast-non-reasoning'),
                inputTokens: metrics.inputTokens,
                outputTokens: metrics.outputTokens,
                voiceSessionMinutes: metrics.voiceSessionMinutes,
                costUSD,
            });
        });
    }
    /**
     * Get usage for a user
     */
    getUserUsage(userId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = { userId };
            if (startDate || endDate) {
                query.createdAt = {};
                if (startDate)
                    query.createdAt.$gte = startDate;
                if (endDate)
                    query.createdAt.$lte = endDate;
            }
            return usage_model_1.default.find(query).sort({ createdAt: -1 });
        });
    }
    /**
     * Get usage for a session
     */
    getSessionUsage(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            return usage_model_1.default.find({ sessionId }).sort({ createdAt: 1 });
        });
    }
    /**
     * Get total cost for a user
     */
    getUserTotalCost(userId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const usage = yield this.getUserUsage(userId, startDate, endDate);
            return usage.reduce((total, record) => total + record.costUSD, 0);
        });
    }
    /**
     * Get total cost for a session
     */
    getSessionTotalCost(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            const usage = yield this.getSessionUsage(sessionId);
            return usage.reduce((total, record) => total + record.costUSD, 0);
        });
    }
    /**
     * Get usage statistics for a user
     */
    getUserStats(userId, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            const usage = yield this.getUserUsage(userId, startDate, endDate);
            const stats = {
                totalRequests: usage.length,
                totalCostUSD: 0,
                totalInputTokens: 0,
                totalOutputTokens: 0,
                totalVoiceSessionMinutes: 0,
                byProvider: {},
            };
            usage.forEach((record) => {
                stats.totalCostUSD += record.costUSD;
                stats.totalInputTokens += record.inputTokens;
                stats.totalOutputTokens += record.outputTokens;
                stats.totalVoiceSessionMinutes += record.whisperDuration / 60; // Convert to minutes (used for voice sessions)
                // Track by provider (would need to add provider field to model)
                // For now, aggregate by type
                const key = record.type;
                if (!stats.byProvider[key]) {
                    stats.byProvider[key] = { requests: 0, cost: 0 };
                }
                stats.byProvider[key].requests += 1;
                stats.byProvider[key].cost += record.costUSD;
            });
            return stats;
        });
    }
    /**
     * Get daily usage count for a user (for free tier limits)
     */
    getDailyUsageCount(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const count = yield usage_model_1.default.countDocuments({
                userId,
                createdAt: { $gte: startOfDay },
            });
            return count;
        });
    }
    /**
     * Check if user has exceeded free tier limit
     */
    hasExceededFreeLimit(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const dailyCount = yield this.getDailyUsageCount(userId);
            const FREE_TIER_LIMIT = 5; // 5 messages per day
            return dailyCount >= FREE_TIER_LIMIT;
        });
    }
}
exports.tokenMeterService = new TokenMeterService();
exports.default = exports.tokenMeterService;
