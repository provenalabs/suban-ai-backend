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
exports.grokService = void 0;
const axios_1 = __importDefault(require("axios"));
class GrokService {
    constructor() {
        this.apiKey = null;
        this.baseUrl = 'https://api.x.ai/v1';
        this.apiKey = process.env.GROK_API_KEY || null;
    }
    /**
     * Check if Grok is configured
     */
    isAvailable() {
        return this.apiKey !== null;
    }
    /**
     * Chat completion using Grok
     * @param messages Array of messages
     * @param model Model to use (default: grok-4-1-fast-non-reasoning)
     * @param maxTokens Maximum tokens in response (default: 500 for cost control)
     * @param temperature Temperature (default: 0.7)
     */
    chat(messages_1) {
        return __awaiter(this, arguments, void 0, function* (messages, model = 'grok-4-1-fast-non-reasoning', maxTokens = 500, temperature = 0.7) {
            if (!this.apiKey) {
                throw new Error('Grok API key not configured');
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
                    throw new Error('No response from Grok');
                }
                const usage = response.data.usage || {
                    prompt_tokens: 0,
                    completion_tokens: 0,
                    total_tokens: 0,
                };
                return {
                    text: choice.message.content || '',
                    usage,
                    cost: this.calculateCost(usage, model),
                    model: response.data.model || model,
                };
            }
            catch (error) {
                throw new Error(`Grok chat failed: ${error.message}`);
            }
        });
    }
    /**
     * Calculate cost based on token usage and model
     * IMPORTANT: Pricing must be updated from official xAI API documentation
     * Current rates are estimates - verify and update from https://x.ai/pricing
     */
    calculateCost(usage, model) {
        const rates = {
            'grok-4-1-fast-reasoning': { input: 2.0, output: 10.0 },
            'grok-4-1-fast-non-reasoning': { input: 1.0, output: 5.0 },
            // Legacy models (fallback)
            'grok-2': { input: 2.0, output: 10.0 },
            'grok-2-mini': { input: 1.0, output: 5.0 },
        };
        const rate = rates[model] || rates['grok-4-1-fast-non-reasoning'];
        const inputCost = (usage.prompt_tokens / 1000000) * rate.input;
        const outputCost = (usage.completion_tokens / 1000000) * rate.output;
        return inputCost + outputCost;
    }
}
exports.grokService = new GrokService();
exports.default = exports.grokService;
