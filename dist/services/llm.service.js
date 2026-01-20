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
exports.llmService = void 0;
const deepseek_service_1 = __importDefault(require("./deepseek.service"));
const grok_service_1 = __importDefault(require("./grok.service"));
const modelRouter_1 = __importDefault(require("../utils/modelRouter"));
const promptBuilder_1 = __importDefault(require("../utils/promptBuilder"));
class LLMService {
    constructor() {
        this.MAX_OUTPUT_TOKENS = 500; // Cost control
        this.MAX_RESPONSE_WORDS = 150; // Cost control
        // Services are initialized via their constructors
    }
    /**
     * Generate response using intelligent routing
     */
    generateResponse(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, options = {}) {
            const { userTier = 'free', conversationHistory = [], maxTokens = this.MAX_OUTPUT_TOKENS, temperature = 0.7, } = options;
            // Intelligent model selection based on intent
            const routing = modelRouter_1.default.selectModel(prompt, userTier);
            // Build system prompt with cost guardrails
            const systemPrompt = promptBuilder_1.default.buildSystemPrompt({
                maxWords: this.MAX_RESPONSE_WORDS,
                maxTokens,
                enforceAnalystLanguage: true,
                preventBuySell: true,
                frameAsScenarios: true,
            });
            // Build messages with context truncation
            const messages = [
                { role: 'system', content: systemPrompt },
                ...promptBuilder_1.default.buildUserMessage(prompt, conversationHistory),
            ];
            try {
                let response;
                if (routing.provider === 'deepseek') {
                    const deepseekResponse = yield deepseek_service_1.default.chat(messages, 'deepseek-chat', maxTokens, temperature);
                    response = {
                        content: promptBuilder_1.default.truncateResponse(deepseekResponse.text, this.MAX_RESPONSE_WORDS),
                        inputTokens: deepseekResponse.usage.prompt_tokens,
                        outputTokens: deepseekResponse.usage.completion_tokens,
                        model: deepseekResponse.model,
                        provider: 'deepseek',
                        intent: routing.intent,
                        cost: deepseekResponse.cost,
                    };
                }
                else {
                    // Grok - use the model selected by router (grok-4-1-fast-reasoning or grok-4-1-fast-non-reasoning)
                    const grokModel = routing.model === 'grok-4-1-fast-reasoning'
                        ? 'grok-4-1-fast-reasoning'
                        : 'grok-4-1-fast-non-reasoning';
                    const grokResponse = yield grok_service_1.default.chat(messages, grokModel, maxTokens, temperature);
                    response = {
                        content: promptBuilder_1.default.truncateResponse(grokResponse.text, this.MAX_RESPONSE_WORDS),
                        inputTokens: grokResponse.usage.prompt_tokens,
                        outputTokens: grokResponse.usage.completion_tokens,
                        model: grokResponse.model,
                        provider: 'grok',
                        intent: routing.intent,
                        cost: grokResponse.cost,
                    };
                }
                return response;
            }
            catch (error) {
                // Retry once with exponential backoff for rate limits
                if (error.status === 429 ||
                    error.code === 'rate_limit_exceeded' ||
                    error.code === 'EAI_AGAIN' ||
                    error.code === 'ETIMEDOUT' ||
                    error.code === 'ECONNRESET') {
                    console.log(`Retrying due to error: ${error.code || error.status}`);
                    yield this.delay(2000);
                    return this.generateResponse(prompt, options);
                }
                throw error;
            }
        });
    }
    /**
     * Legacy method for backward compatibility
     * @deprecated Use generateResponse with options instead
     */
    generateResponseLegacy(prompt_1) {
        return __awaiter(this, arguments, void 0, function* (prompt, modelType = 'cheap') {
            // Map legacy model types to user tiers
            const userTier = modelType === 'expensive' ? 'paid' : 'free';
            return this.generateResponse(prompt, { userTier });
        });
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Get available providers
     */
    getAvailableProviders() {
        return {
            deepseek: deepseek_service_1.default.isAvailable(),
            grok: grok_service_1.default.isAvailable(),
        };
    }
    /**
     * Check if service is available
     */
    isAvailable() {
        const providers = this.getAvailableProviders();
        return providers.deepseek || providers.grok;
    }
    /**
     * Legacy method for backward compatibility
     * @deprecated Use getAvailableProviders instead
     */
    getAvailableModels() {
        const providers = this.getAvailableProviders();
        const available = [];
        if (providers.deepseek || providers.grok) {
            available.push('cheap', 'mid', 'expensive'); // Legacy compatibility
        }
        return available;
    }
    /**
     * Legacy method for backward compatibility
     * @deprecated Models are now selected intelligently
     */
    isModelAvailable(modelType) {
        return this.isAvailable();
    }
}
exports.llmService = new LLMService();
exports.default = exports.llmService;
