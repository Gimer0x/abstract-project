const logger = require('./logger');

// Required environment variables for production
const requiredEnvVars = {
  // OpenAI Configuration
  OPENAI_API_KEY: 'OpenAI API key is required for document processing',
  
  // MongoDB Configuration
  MONGODB_URI: 'MongoDB connection string is required',
  
  // JWT Configuration
  JWT_SECRET: 'JWT secret is required for authentication',
  
  // Session Configuration
  SESSION_SECRET: 'Session secret is required for session management',
  
  // Google OAuth Configuration (if using Google auth)
  GOOGLE_CLIENT_ID: 'Google Client ID is required for OAuth',
  GOOGLE_CLIENT_SECRET: 'Google Client Secret is required for OAuth',
  
  // Stripe Configuration (if using billing)
  STRIPE_SECRET_KEY: 'Stripe secret key is required for billing',
  STRIPE_PUBLISHABLE_KEY: 'Stripe publishable key is required for billing',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook secret is required for webhooks',
  
  // Frontend URL
  FRONTEND_URL: 'Frontend URL is required for CORS configuration',
};

// Optional environment variables with defaults
const optionalEnvVars = {
  PORT: '5001',
  NODE_ENV: 'development',
  MAX_FILE_SIZE: '5242880', // 5MB
};

// Validate environment variables
const validateEnvironment = () => {
  const missingVars = [];
  const warnings = [];

  // Check required variables
  for (const [varName, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[varName]) {
      missingVars.push({ name: varName, description });
    }
  }

  // Check optional variables and set defaults
  for (const [varName, defaultValue] of Object.entries(optionalEnvVars)) {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      warnings.push(`Using default value for ${varName}: ${defaultValue}`);
    }
  }

  // Log warnings
  if (warnings.length > 0) {
    logger.warn('Environment validation warnings:');
    warnings.forEach(warning => logger.warn(warning));
  }

  // Throw error if required variables are missing
  if (missingVars.length > 0) {
    logger.error('Missing required environment variables:');
    missingVars.forEach(({ name, description }) => {
      logger.error(`  ${name}: ${description}`);
    });
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Missing required environment variables. Check the logs above.');
    } else {
      logger.warn('Continuing in development mode with missing variables...');
    }
  }

  // Validate specific variables
  validateSpecificVariables();

  logger.info('Environment validation completed successfully');
};

// Validate specific variable formats
const validateSpecificVariables = () => {
  // Validate MongoDB URI
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
    logger.warn('MONGODB_URI should start with mongodb:// or mongodb+srv://');
  }

  // Validate JWT Secret strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    logger.warn('JWT_SECRET should be at least 32 characters long for security');
  }

  // Validate Session Secret strength
  if (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length < 32) {
    logger.warn('SESSION_SECRET should be at least 32 characters long for security');
  }

  // Validate file size limit
  const maxFileSize = parseInt(process.env.MAX_FILE_SIZE);
  if (isNaN(maxFileSize) || maxFileSize <= 0) {
    logger.warn('MAX_FILE_SIZE should be a positive number');
  }

  // Validate port number
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    logger.warn('PORT should be a number between 1 and 65535');
  }
};

// Export validation function
module.exports = {
  validateEnvironment,
  requiredEnvVars,
  optionalEnvVars
}; 