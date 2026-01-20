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
exports.deepseekService = void 0;
const axios_1 = __importDefault(require("axios"));
class DeepSeekService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.deepseek.com/v1';
        this.apiKey = process.env.DEEPSEEK_API_KEY || null;
    }
    /**
     * Check if DeepSeek is configured
     */
    isAvailable() {
        return this.apiKey !== null;
    }
    /**
     * Chat completion using DeepSeek
     * @param messages Array of messages
     * @param model Model to use (default: deepseek-chat)
     * @param maxTokens Maximum tokens in response (default: 500 for cost control)
     * @param temperature Temperature (default: 0.7)
     */
    chat(messages_1) {
        return __awaiter(this, arguments, void 0, function* (messages, model = 'deepseek-chat', maxTokens = 500, temperature = 0.7) {
            if (!this.apiKey) {
                throw new Error('DeepSeek API key not configured');
            }
            try {
                const response = yield axios_1.default.post(`${this.baseUrl}/chat/completions`, {
                    model,
                    messages,
                    max_tokens: maxTokens,
                    temperature,
                    stream: false,
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000,
                });
                const choice = response.data.choices[0];
                if (!choice || !choice.message) {
                    throw new Error('No response from DeepSeek');
                }
                const usage = response.data.usage || {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                };
                return {
                    text: choice.message.content || '',
                    usage,
                    cost: this.calculateCost(usage),
                    model: response.data.model || model,
                };
            }
            catch (error) {
                throw new Error(`DeepSeek chat failed: ${error.message}`);
            }
        });
    }
    /**
     * Calculate cost based on token usage
     * DeepSeek V3 pricing: $0.27/M input tokens, $1.10/M output tokens
     */
    calculateCost(usage) {
        const inputCost = (usage.prompt_tokens / 1000000) * 0.27;
        const outputCost = (usage.completion_tokens / 1000000) * 1.10;
        return inputCost + outputCost;
    }
}
exports.deepseekService = new DeepSeekService();
exports.default = exports.deepseekService;
