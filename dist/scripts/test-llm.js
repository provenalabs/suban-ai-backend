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
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from backend root
dotenv_1.default.config({ path: path_1.default.join(__dirname, '../../.env') });
const llm_service_1 = require("../services/llm.service");
function testDeepSeek() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Testing DeepSeek Integration...');
        try {
            console.log('Using "cheap" tier (should be DeepSeek)...');
            const response1 = yield llm_service_1.llmService.generateResponse('Hello! Are you running on DeepSeek?', { userTier: 'free' });
            console.log('Response:', response1.content);
            console.log('Provider:', response1.provider);
            console.log('Model:', response1.model);
            console.log('-----------------------------------');
            console.log('Using "expensive" tier (should fallback to DeepSeek)...');
            const response2 = yield llm_service_1.llmService.generateResponse('Tell me about Solana briefly.', { userTier: 'paid' });
            console.log('Response:', response2.content);
            console.log('Provider:', response2.provider);
            console.log('Model:', response2.model);
        }
        catch (error) {
            console.error('Error during test:', error.message);
            if (error.response) {
                console.error('API Error Response:', JSON.stringify(error.response.data, null, 2));
                console.error('Status:', error.response.status);
            }
        }
    });
}
testDeepSeek();
