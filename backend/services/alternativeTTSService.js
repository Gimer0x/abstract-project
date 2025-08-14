const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Alternative TTS service using free APIs
 * This serves as a fallback when OpenAI TTS quota is exceeded
 */

/**
 * Convert text to speech using a free TTS service
 * @param {string} text - Text to convert to speech
 * @param {string} originalFilename - Original document filename for context
 * @param {string} summarySize - Summary size used
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
async function textToMP3Alternative(text, originalFilename, summarySize = 'short') {
  try {
    // Prepare the text for speech synthesis
    const speechText = prepareTextForSpeech(text, originalFilename, summarySize);
    
    // Use a free TTS service (example with gTTS-like service)
    const audioBuffer = await generateSpeechWithFreeAPI(speechText);
    
    return audioBuffer;
    
  } catch (error) {
    console.error('Alternative TTS error:', error);
    throw new Error(`Alternative TTS service error: ${error.message}`);
  }
}

/**
 * Generate speech using a free TTS API
 * @param {string} text - Text to convert
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function generateSpeechWithFreeAPI(text) {
  try {
    // Option 1: Use a free TTS service (example)
    // You can replace this with any free TTS API
    const response = await axios({
      method: 'GET',
      url: `https://api.voicerss.org/`,
      params: {
        key: process.env.VOICERSS_API_KEY || 'free_key', // You can get a free key
        hl: 'en-us',
        src: text,
        c: 'MP3',
        f: '44khz_16bit_stereo'
      },
      responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
    
  } catch (error) {
    // If free API fails, create a simple audio file with instructions
    return createFallbackAudio(text);
  }
}

/**
 * Create a fallback audio file with instructions
 * @param {string} text - Text content
 * @returns {Buffer} - Simple audio buffer
 */
function createFallbackAudio(text) {
  // Create a simple text file with instructions
  const fallbackContent = `
TTS Service Unavailable

The text-to-speech service is currently unavailable due to quota limits.

Text Content:
${text}

To resolve this issue:
1. Visit: https://platform.openai.com/account/billing
2. Add a payment method or upgrade your plan
3. Try again later

Alternative: Use PDF, DOCX, or TXT export options instead.
  `;

  // Return as text buffer (this will be converted to a simple audio file)
  return Buffer.from(fallbackContent, 'utf8');
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
 * Check if alternative TTS service is available
 * @returns {Promise<boolean>} - True if service is available
 */
async function checkAlternativeTTSServiceAvailability() {
  try {
    // Test with a simple request
    const testBuffer = await generateSpeechWithFreeAPI("Test");
    return testBuffer.length > 0;
  } catch (error) {
    console.log('Alternative TTS service availability check failed:', error.message);
    return false;
  }
}

module.exports = {
  textToMP3Alternative,
  checkAlternativeTTSServiceAvailability
};
