# OpenAI Text-to-Speech Setup Guide

This guide will help you set up OpenAI Text-to-Speech API for the MP3 audio export feature.

## Prerequisites

1. OpenAI API account with billing enabled
2. Existing OpenAI API key (same as used for document processing)
3. Node.js application with the required dependencies

## Step 1: Verify OpenAI API Access

1. Go to your [OpenAI API Dashboard](https://platform.openai.com/api-keys)
2. Ensure your API key has access to the Text-to-Speech API
3. Check that billing is enabled for your account

## Step 2: Verify API Key Permissions

Your existing OpenAI API key should already have access to:
- GPT-4 (for document processing)
- Text-to-Speech API (for audio generation)

If you encounter any issues, check your API key permissions in the OpenAI dashboard.

## Step 3: Configure Your Application

1. Ensure your `.env` file has the OpenAI API key:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

2. The same API key used for document processing will be used for TTS

## Step 4: Test the Integration

1. Start your backend server
2. Process a document and generate a summary
3. Try exporting as MP3 to test the audio generation

## Voice Options

The current implementation uses:
- **Voice**: `alloy` (Professional, neutral voice)
- **Model**: `tts-1` (Latest OpenAI TTS model)
- **Format**: MP3 audio files

### Available OpenAI TTS Voices:
- **alloy**: Professional, neutral voice
- **echo**: Warm, friendly voice
- **fable**: Storytelling voice
- **onyx**: Deep, authoritative voice
- **nova**: Bright, energetic voice
- **shimmer**: Soft, gentle voice

You can modify the voice in `backend/services/openaiTTSService.js`:

```javascript
const mp3 = await openai.audio.speech.create({
  model: "tts-1",
  voice: "alloy", // Change to any of the voices above
  input: speechText,
});
```

## Cost Management

- **OpenAI TTS pricing**: ~$15 per 1M characters
- **Typical summary cost**: ~$0.008 per summary (500-1000 characters)
- **Monitor usage** in your OpenAI dashboard
- **Set up billing alerts** to avoid unexpected charges

## API Limits

- **Characters per request**: 4,096 characters
- **Requests per minute**: 50 requests
- **Requests per day**: 1,000 requests

For larger documents, the summary will be truncated to fit within these limits.

## Troubleshooting

### Common Issues

1. **"API key not found"**
   - Ensure OPENAI_API_KEY is set in your .env file
   - Verify the API key is valid in OpenAI dashboard

2. **"Insufficient credits"**
   - Add billing information to your OpenAI account
   - Check your usage and billing status

3. **"Rate limit exceeded"**
   - Check your API usage in OpenAI dashboard
   - Implement rate limiting if needed

4. **"Invalid voice"**
   - Ensure you're using a valid voice name
   - Check the available voices list above

### Error Handling

The application includes comprehensive error handling:
- Network errors are caught and logged
- API errors are returned with helpful messages
- Rate limiting is handled gracefully

## Security Considerations

- **API key security**: Never commit API keys to version control
- **Environment variables**: Use .env files for sensitive data
- **Rate limiting**: Monitor usage to prevent abuse
- **Error logging**: Sensitive data is not logged

## Production Deployment

For production environments:

1. **Use environment variables** for API keys
2. **Monitor API usage** and costs
3. **Implement rate limiting** to control costs
4. **Set up billing alerts** in OpenAI dashboard
5. **Use proper error handling** and logging

## Support

If you encounter issues:

1. Check the OpenAI API status at [status.openai.com](https://status.openai.com)
2. Review your API usage in the OpenAI dashboard
3. Check the application logs for detailed error messages
4. Verify all environment variables are properly set

## Voice Customization

To change the voice or add voice selection:

1. **Modify the service**: Update `backend/services/openaiTTSService.js`
2. **Add voice selection**: Create a voice selector in the frontend
3. **Update API**: Add voice parameter to the export endpoint

Example voice selection:
```javascript
// In the frontend
const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

// In the backend
const voice = req.body.voice || 'alloy';
const mp3 = await openai.audio.speech.create({
  model: "tts-1",
  voice: voice,
  input: speechText,
});
```

## Performance Optimization

- **Caching**: Consider caching generated audio files
- **Compression**: Audio files are already optimized by OpenAI
- **CDN**: Serve audio files through a CDN for better performance
- **Background processing**: Consider generating audio in the background

---

**Note**: This implementation uses the same OpenAI API key as your document processing, making it simple to set up and manage. 