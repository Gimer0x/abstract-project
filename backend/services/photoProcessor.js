const OpenAI = require('openai');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {Object} - Validation result
 */
function validateImageFile(file) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: `Unsupported file type. Allowed: ${allowedTypes.join(', ')}` 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB` 
    };
  }
  
  return { valid: true };
}

/**
 * Test if image can be processed
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Object>} - Test result
 */
async function testImageProcessability(filePath) {
  try {
    const image = sharp(filePath);
    await image.metadata();
    return { processable: true };
  } catch (error) {
    return { 
      processable: false, 
      error: `Image cannot be processed: ${error.message}` 
    };
  }
}

/**
 * Optimize image for processing
 * @param {string} filePath - Path to the image file
 * @returns {Promise<Buffer>} - Optimized image buffer
 */
async function optimizeImage(filePath) {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    
    // Resize if too large (max 2048px width/height)
    if (metadata.width > 2048 || metadata.height > 2048) {
      image.resize(2048, 2048, { 
        fit: 'inside',
        withoutEnlargement: true 
      });
    }
    
    // Convert to JPEG for better OCR results
    const optimizedBuffer = await image
      .jpeg({ quality: 85 })
      .toBuffer();
    
    return optimizedBuffer;
  } catch (error) {
    throw new Error(`Image optimization failed: ${error.message}`);
  }
}

/**
 * Extract text and description from image using OpenAI Vision API
 * @param {Buffer} imageBuffer - Image buffer
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Extracted text and description
 */
async function extractTextFromImage(imageBuffer, filename) {
  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');
    
    // Create OpenAI Vision API request
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and provide:
1. All text content found in the image (if any)
2. A brief description of what you see in the image

If there's text in the image, extract it accurately. If there's no text, provide a clear description of the image content.

Format your response as:
TEXT: [extracted text or "No text found"]
DESCRIPTION: [brief description of the image]`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });

    const content = response.choices[0].message.content;
    
    // Parse the response
    const textMatch = content.match(/TEXT:\s*(.*?)(?=\nDESCRIPTION:|$)/s);
    const descriptionMatch = content.match(/DESCRIPTION:\s*(.*?)(?=\n|$)/s);
    
    const extractedText = textMatch ? textMatch[1].trim() : '';
    const imageDescription = descriptionMatch ? descriptionMatch[1].trim() : '';
    
    return {
      extractedText,
      imageDescription
    };
    
  } catch (error) {
    console.error('OpenAI Vision API error:', error);
    
    if (error.status === 429) {
      throw new Error('OpenAI Vision API quota exceeded. Please try again later.');
    } else if (error.status === 400) {
      throw new Error('Image could not be processed. Please try a different image.');
    } else {
      throw new Error(`Vision API error: ${error.message}`);
    }
  }
}

/**
 * Process a single image
 * @param {string} filePath - Path to the image file
 * @param {string} filename - Original filename
 * @returns {Promise<Object>} - Processing result
 */
async function processImage(filePath, filename) {
  try {
    // Optimize image
    const optimizedBuffer = await optimizeImage(filePath);
    
    // Extract text and description
    const { extractedText, imageDescription } = await extractTextFromImage(optimizedBuffer, filename);
    
    // Clean up temporary file
    await fs.unlink(filePath);
    
    return {
      success: true,
      extractedText,
      imageDescription,
      optimizedSize: optimizedBuffer.length
    };
    
  } catch (error) {
    // Clean up temporary file on error
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error('Failed to cleanup file:', cleanupError);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Join extracted text from multiple images in logical order
 * @param {Array} photos - Array of photo objects with extracted text
 * @returns {Promise<string>} - Joined text from images containing text
 */
async function joinTextFromPhotos(photos) {
  try {
    // Filter only completed photos with extracted text (skip images without text)
    const completedPhotos = photos.filter(photo => 
      photo.processingStatus === 'completed' && 
      photo.extractedText && 
      photo.extractedText.trim() !== '' &&
      photo.extractedText.toLowerCase() !== 'no text found' &&
      photo.extractedText.toLowerCase() !== 'no text detected'
    );

    if (completedPhotos.length === 0) {
      return 'No text was found in any of the uploaded images.';
    }

    // Join all extracted text in logical order
    const organizedText = completedPhotos
      .map((photo, index) => {
        return photo.extractedText.trim();
      })
      .join('\n\n');

    return organizedText;
    
  } catch (error) {
    console.error('Text organization error:', error);
    return 'Error processing text from images.';
  }
}

module.exports = {
  validateImageFile,
  testImageProcessability,
  processImage,
  organizeTextFromPhotos: joinTextFromPhotos
};
