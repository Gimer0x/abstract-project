const OpenAI = require('openai');
const { textToMP3Alternative } = require('./alternativeTTSService');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Convert text to speech and return as MP3 buffer
 * @param {string} text - Text to convert to speech
 * @param {string} originalFilename - Original document filename for context
 * @param {string} summarySize - Summary size used
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
async function textToMP3(text, originalFilename, summarySize = 'short') {
  try {
    // Prepare the text for speech synthesis
    const speechText = prepareTextForSpeech(text, originalFilename, summarySize);
    
    // Generate speech using OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy", // Professional, neutral voice
      input: speechText,
    });

    // Convert to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
    
  } catch (error) {
    console.error('OpenAI TTS error:', error);
    
    // Handle specific error types
    if (error.status === 429) {
      if (error.error?.type === 'insufficient_quota') {
        console.log('OpenAI TTS quota exceeded, trying alternative service...');
        try {
          // Try alternative TTS service
          return await textToMP3Alternative(text, originalFilename, summarySize);
        } catch (fallbackError) {
          throw new Error('OpenAI TTS quota exceeded and alternative service unavailable. Please check your billing at https://platform.openai.com/account/billing or try again later.');
        }
      } else {
        throw new Error('OpenAI TTS rate limit exceeded. Please try again in a few minutes.');
      }
    } else if (error.status === 401) {
      throw new Error('OpenAI API key is invalid. Please check your configuration.');
    } else if (error.status === 400) {
      throw new Error('Invalid request to OpenAI TTS service. Text may be too long or contain invalid characters.');
    } else {
      throw new Error(`OpenAI TTS service error: ${error.message}`);
    }
  }
}

/**
 * Check if OpenAI TTS service is available
 * @returns {Promise<boolean>} - True if service is available
 */
async function checkTTSServiceAvailability() {
  try {
    // Try a minimal test request
    const testMp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: "Test",
    });
    return true;
  } catch (error) {
    console.log('TTS service availability check failed:', error.message);
    return false;
  }
}

/**
 * Prepare text for speech synthesis with proper formatting
 * @param {string} text - Original text
 * @param {string} originalFilename - Original document filename
 * @param {string} summarySize - Summary size used
 * @returns {string} - Formatted text for speech
 */
function prepareTextForSpeech(text, originalFilename, summarySize) {
  // Extract filename without extension
  const filename = originalFilename.replace(/\.[^/.]+$/, '');
  
  // Create a professional introduction
  let speechText = `Document Summary Audio. `;
  speechText += `Original document: ${filename}. `;
  speechText += `Summary size: ${summarySize.charAt(0).toUpperCase() + summarySize.slice(1)}. `;
  speechText += `Generated on ${new Date().toLocaleDateString()}. `;
  speechText += `\n\n`;
  
  // Add the main content
  speechText += text;
  
  // Add closing
  speechText += `\n\nEnd of summary. Thank you for using Abstract Document Summarizer.`;
  
  return speechText;
}

/**
 * Convert summary data to speech-friendly text
 * @param {Object} summaryData - Summary data object
 * @returns {string} - Formatted text for speech synthesis
 */
function formatSummaryForSpeech(summaryData) {
  let speechText = '';
  
  // Add executive summary
  if (summaryData.executiveSummary) {
    speechText += `Executive Summary. `;
    speechText += summaryData.executiveSummary;
    speechText += `\n\n`;
  }
  
  // Add key points
  if (summaryData.keyPoints && summaryData.keyPoints.length > 0) {
    speechText += `Key Points. `;
    summaryData.keyPoints.forEach((point, index) => {
      speechText += `Point ${index + 1}: ${point}. `;
    });
    speechText += `\n\n`;
  }
  
  // Add action items
  if (summaryData.actionItems && summaryData.actionItems.length > 0) {
    speechText += `Action Items. `;
    summaryData.actionItems.forEach((item, index) => {
      speechText += `Action ${index + 1}: ${item}. `;
    });
    speechText += `\n\n`;
  }
  
  // Add important dates
  if (summaryData.importantDates && summaryData.importantDates.length > 0) {
    speechText += `Important Dates. `;
    summaryData.importantDates.forEach((date, index) => {
      speechText += `Date ${index + 1}: ${date}. `;
    });
    speechText += `\n\n`;
  }
  
  // Add relevant names
  if (summaryData.relevantNames && summaryData.relevantNames.length > 0) {
    speechText += `Relevant Names. `;
    summaryData.relevantNames.forEach((name, index) => {
      speechText += `Name ${index + 1}: ${name}. `;
    });
    speechText += `\n\n`;
  }
  
  // Add places
  if (summaryData.places && summaryData.places.length > 0) {
    speechText += `Places Mentioned. `;
    summaryData.places.forEach((place, index) => {
      speechText += `Place ${index + 1}: ${place}. `;
    });
    speechText += `\n\n`;
  }
  
  return speechText;
}

module.exports = {
  textToMP3,
  formatSummaryForSpeech,
  checkTTSServiceAvailability
}; 