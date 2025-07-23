const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate summary and extract key information from document text
 * @param {string} text - Extracted text from document
 * @returns {Promise<Object>} - Summary and extracted information
 */
async function generateSummary(text) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not configured');
    }

    // Truncate text if it's too long for the API
    const maxTokens = 4000; // Leave room for response
    const truncatedText = text.length > maxTokens * 4 ? text.substring(0, maxTokens * 4) + '...' : text;

    const prompt = `
Please analyze the following document and provide:

1. EXECUTIVE SUMMARY: A concise executive summary (2-3 paragraphs maximum)
2. KEY POINTS: Extract the main ideas and concepts (bullet points)
3. ACTION ITEMS: Identify any tasks, to-dos, or actionable content
4. IMPORTANT DATES: Extract any dates, deadlines, or timelines mentioned
5. RELEVANT NAMES: Identify people, organizations, companies, or entities
6. PLACES: Extract locations, addresses, or geographical references

Document content:
${truncatedText}

Please format your response as follows:

EXECUTIVE SUMMARY:
[Your executive summary here]

KEY POINTS:
• [Key point 1]
• [Key point 2]
• [Key point 3]

ACTION ITEMS:
• [Action item 1]
• [Action item 2]

IMPORTANT DATES:
• [Date 1]
• [Date 2]

RELEVANT NAMES:
• [Name/Entity 1]
• [Name/Entity 2]

PLACES:
• [Place 1]
• [Place 2]
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional document analyst. Provide clear, concise, and well-structured summaries and information extraction."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content;
    
    // Parse the response into structured format
    const parsedResponse = parseOpenAIResponse(response);
    
    return {
      rawResponse: response,
      ...parsedResponse
    };

  } catch (error) {
    console.error('OpenAI API Error:', error);
    
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your account.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}

/**
 * Parse OpenAI response into structured format
 * @param {string} response - Raw response from OpenAI
 * @returns {Object} - Parsed response object
 */
function parseOpenAIResponse(response) {
  const sections = {
    executiveSummary: '',
    keyPoints: [],
    actionItems: [],
    importantDates: [],
    relevantNames: [],
    places: []
  };

  const lines = response.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;

    // Identify sections
    if (trimmedLine.toUpperCase().includes('EXECUTIVE SUMMARY')) {
      currentSection = 'executiveSummary';
      continue;
    } else if (trimmedLine.toUpperCase().includes('KEY POINTS')) {
      currentSection = 'keyPoints';
      continue;
    } else if (trimmedLine.toUpperCase().includes('ACTION ITEMS')) {
      currentSection = 'actionItems';
      continue;
    } else if (trimmedLine.toUpperCase().includes('IMPORTANT DATES')) {
      currentSection = 'importantDates';
      continue;
    } else if (trimmedLine.toUpperCase().includes('RELEVANT NAMES')) {
      currentSection = 'relevantNames';
      continue;
    } else if (trimmedLine.toUpperCase().includes('PLACES')) {
      currentSection = 'places';
      continue;
    }

    // Process content based on current section
    if (currentSection === 'executiveSummary') {
      sections.executiveSummary += trimmedLine + ' ';
    } else if (currentSection && trimmedLine.startsWith('•')) {
      const content = trimmedLine.substring(1).trim();
      if (content) {
        sections[currentSection].push(content);
      }
    } else if (currentSection && trimmedLine.startsWith('-')) {
      const content = trimmedLine.substring(1).trim();
      if (content) {
        sections[currentSection].push(content);
      }
    }
  }

  // Clean up executive summary
  sections.executiveSummary = sections.executiveSummary.trim();

  return sections;
}

/**
 * Test OpenAI API connection
 * @returns {Promise<boolean>} - True if connection is successful
 */
async function testConnection() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: "Hello" }],
      max_tokens: 5,
    });
    return true;
  } catch (error) {
    console.error('OpenAI connection test failed:', error);
    return false;
  }
}

module.exports = {
  generateSummary,
  testConnection
}; 