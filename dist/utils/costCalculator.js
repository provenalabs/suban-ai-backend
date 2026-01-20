"use strict";
/**
 * Cost Calculator
 * Actual pricing for DeepSeek and Grok services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateCost = exports.calculateCostWithMarkup = exports.calculateUsageCost = exports.COSTS = void 0;
exports.COSTS = {
    // DeepSeek Pricing (Text-based chat only)
    DEEPSEEK_LLM_INPUT_PER_M: 0.27, // $0.27 per million input tokens
    DEEPSEEK_LLM_OUTPUT_PER_M: 1.10, // $1.10 per million output tokens
    // Grok Pricing
    // IMPORTANT: Verify and update pricing from official xAI API documentation at https://x.ai/pricing
    GROK_LLM_INPUT_PER_M: {
        'grok-4-1-fast-reasoning': 2.0, // $2.0 per million input tokens
        'grok-4-1-fast-non-reasoning': 1.0, // $1.0 per million input tokens
        // Legacy models (fallback)
        'grok-2': 2.0,
        'grok-2-mini': 1.0,
    },
    GROK_LLM_OUTPUT_PER_M: {
        'grok-4-1-fast-reasoning': 10.0, // $10.0 per million output tokens
        'grok-4-1-fast-non-reasoning': 5.0, // $5.0 per million output tokens
        // Legacy models (fallback)
        'grok-2': 10.0,
        'grok-2-mini': 5.0,
    },
    // Margin multiplier (2x for token burn calculation)
    MARKUP_MULTIPLIER: 2.0,
};
/**
 * Calculate total cost for a usage session
 */
const calculateUsageCost = (metrics) => {
    let totalCost = 0;
    // LLM cost (text-based chat)
    if (metrics.provider === 'deepseek') {
        const inputCost = (metrics.inputTokens / 1000000) * exports.COSTS.DEEPSEEK_LLM_INPUT_PER_M;
        const outputCost = (metrics.outputTokens / 1000000) * exports.COSTS.DEEPSEEK_LLM_OUTPUT_PER_M;
        totalCost += inputCost + outputCost;
    }
    else if (metrics.provider === 'grok') {
        const model = metrics.model || 'grok-4-1-fast-non-reasoning';
        const inputRate = exports.COSTS.GROK_LLM_INPUT_PER_M[model] || exports.COSTS.GROK_LLM_INPUT_PER_M['grok-4-1-fast-non-reasoning'];
        const outputRate = exports.COSTS.GROK_LLM_OUTPUT_PER_M[model] || exports.COSTS.GROK_LLM_OUTPUT_PER_M['grok-4-1-fast-non-reasoning'];
        const inputCost = (metrics.inputTokens / 1000000) * inputRate;
        const outputCost = (metrics.outputTokens / 1000000) * outputRate;
        totalCost += inputCost + outputCost;
    }
    // Voice session cost (Grok Voice Agent - pricing TBD, estimate based on duration)
    // Note: Grok Voice Agent pricing may be per-minute or per-session
    // Update this when official pricing is available
    if (metrics.voiceSessionMinutes) {
        // Rough estimate: $0.10 per 3-minute session
        // This should be updated with actual Grok Voice Agent pricing
        totalCost += (metrics.voiceSessionMinutes / 3) * 0.10;
    }
    return totalCost;
};
exports.calculateUsageCost = calculateUsageCost;
/**
 * Calculate cost with markup for token burn
 */
const calculateCostWithMarkup = (metrics) => {
    const baseCost = (0, exports.calculateUsageCost)(metrics);
    return baseCost * exports.COSTS.MARKUP_MULTIPLIER;
};
exports.calculateCostWithMarkup = calculateCostWithMarkup;
/**
 * Estimate cost before making API call
 */
const estimateCost = (estimatedInputTokens, estimatedOutputTokens, provider, model) => {
    return (0, exports.calculateUsageCost)({
        inputTokens: estimatedInputTokens,
        outputTokens: estimatedOutputTokens,
        provider,
        model,
    });
};
exports.estimateCost = estimateCost;
