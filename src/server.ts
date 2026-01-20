import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import logger, { requestLoggerMiddleware, errorLoggerMiddleware } from './utils/logger';

// Load environment variables
dotenv.config();

// Validate environment variables
import { envValidator } from './config/env.validation';
const envValidation = envValidator.validate();

if (!envValidation.isValid) {
    console.error(envValidator.getReport());
    console.error(' Environment validation failed. Server will not start.');
    process.exit(1);
}

// Log warnings if any
if (envValidation.warnings.length > 0) {
    console.warn(envValidator.getReport());
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting (apply globally)
import { generalRateLimiter } from './middleware/rateLimit.middleware';
app.use('/api', generalRateLimiter);

// Structured logging middleware (before routes)
app.use(requestLoggerMiddleware);

// Optional: Use morgan for HTTP request logging (can be disabled if using structured logger)
if (process.env.USE_MORGAN !== 'false') {
    app.use(morgan('dev'));
}

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/suban_ai';

// MongoDB connection options for Atlas
const mongooseOptions = {
    serverSelectionTimeoutMS: 30000, // 30 seconds timeout for server selection
    socketTimeoutMS: 45000, // 45 seconds timeout for socket operations
    connectTimeoutMS: 30000, // 30 seconds timeout for initial connection
    retryWrites: true, // Enable retryable writes
    retryReads: true, // Enable retryable reads
    directConnection: false, // Allow SRV connection (required for Atlas)
};

// MongoDB connection event handlers for better debugging
mongoose.connection.on('connected', () => {
    logger.info('MongoDB Connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//***@') });
});

mongoose.connection.on('error', (err) => {
    logger.error('MongoDB Connection Error', { 
        error: err.message,
        stack: err.stack 
    });
});

mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB Disconnected');
});

mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB Reconnected');
});

// Handle process termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed due to application termination');
    process.exit(0);
});

mongoose.connect(MONGODB_URI, mongooseOptions)
    .catch((err) => {
        logger.error('MongoDB Initial Connection Error', { 
            error: err.message,
            stack: err.stack,
            note: 'Connection will retry automatically. If this persists, check your MONGODB_URI and network connectivity.'
        });
        // Don't exit the process - allow server to continue (might be network issue)
    });

// Routes (Placeholders)
app.get('/', (req, res) => {
    res.send('AI Suban API is running');
});

// Import Routes
import authRoutes from './api/auth.routes';
import chatRoutes from './api/chat.routes';
import voiceRoutes from './api/voice.routes';
import tokenRoutes from './api/token.routes';

// Use Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/token', tokenRoutes);

// Initialize Solana services
import priceOracle from './services/solana/price-oracle.service';
import solanaConnection from './services/solana/connection.service';

async function initializeSolanaServices() {
    try {
        logger.info('Initializing Solana services...');
        
        // Test connection
        const isHealthy = await solanaConnection.testConnection();
        if (!isHealthy) {
            logger.warn('Solana connection unhealthy, but continuing...');
        }

        // Start health monitoring (check every 60 seconds)
        solanaConnection.startHealthMonitoring(60000);

        // Initialize price oracle
        await priceOracle.initialize();
        
        // Set up periodic price updates (every 2 minutes)
        setInterval(async () => {
            try {
                await priceOracle.fetchCurrentPrice();
            } catch (error: any) {
                logger.error('Failed to update price', { error: error.message });
            }
        }, 2 * 60 * 1000);

        // Initialize automated settlement
        await initializeAutomatedSettlement();

        logger.info('Solana services initialized successfully');
    } catch (error: any) {
        logger.error('Failed to initialize Solana services', { error: error.message });
    }
}

async function initializeAutomatedSettlement() {
    try {
        const settlementService = (await import('./services/solana/settlement.service')).settlementService;
        
        const intervalMinutes = parseInt(process.env.SETTLEMENT_INTERVAL_MINUTES || '60');
        const thresholdTokens = parseFloat(process.env.SETTLEMENT_THRESHOLD_TOKENS || '1000');

        logger.info('Initializing automated settlement', {
            intervalMinutes,
            thresholdTokens,
        });

        // Check for threshold-based settlement every 5 minutes
        setInterval(async () => {
            try {
                const { balanceTracker } = await import('./services/solana/balance-tracker.service');
                const unsettledRecords = await balanceTracker.getUnsettledRecords(1000);
                const pendingAmount = unsettledRecords.reduce(
                    (sum, record) => sum + record.tokensBurned,
                    0
                );

                if (pendingAmount >= thresholdTokens) {
                    logger.info('Settlement threshold reached, triggering settlement', {
                        pendingAmount,
                        thresholdTokens,
                    });
                    await settlementService.triggerManualSettlement();
                }
            } catch (error: any) {
                logger.error('Automated settlement check failed', { error: error.message });
            }
        }, 5 * 60 * 1000); // Check every 5 minutes

        // Scheduled settlement at regular intervals
        setInterval(async () => {
            try {
                logger.info('Scheduled settlement triggered');
                await settlementService.executeBatchSettlement();
            } catch (error: any) {
                logger.error('Scheduled settlement failed', { error: error.message });
            }
        }, intervalMinutes * 60 * 1000);

        logger.info('Automated settlement initialized');
    } catch (error: any) {
        logger.error('Failed to initialize automated settlement', { error: error.message });
    }
}

// Error handling middleware (must be last)
app.use(errorLoggerMiddleware);

// Start Server
app.listen(PORT, async () => {
    logger.info(`Server started`, { port: PORT, env: process.env.NODE_ENV || 'development' });
    console.log(`🚀 Server running on port ${PORT}`);
    await initializeSolanaServices();
});

