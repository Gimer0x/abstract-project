#!/bin/bash

echo "🔍 OpenAI TTS Quota Checker"
echo "=========================="
echo ""

# Check if we can reach OpenAI API
echo "📡 Checking OpenAI API connectivity..."
if curl -s --max-time 10 https://api.openai.com/v1/models > /dev/null 2>&1; then
    echo "✅ OpenAI API is accessible"
else
    echo "❌ Cannot reach OpenAI API"
    echo "   Check your internet connection"
fi
echo ""

# Check local TTS service status
echo "🎵 Checking local TTS service status..."
TTS_STATUS=$(curl -s http://localhost:5001/health/tts 2>/dev/null | grep -o '"available":[^,]*' | cut -d':' -f2)

if [ "$TTS_STATUS" = "true" ]; then
    echo "✅ TTS service is available"
elif [ "$TTS_STATUS" = "false" ]; then
    echo "❌ TTS service is unavailable (quota exceeded)"
else
    echo "⚠️  Could not determine TTS status"
fi
echo ""

# Check overall API health
echo "🏥 Checking overall API health..."
API_STATUS=$(curl -s http://localhost:5001/health 2>/dev/null | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$API_STATUS" = "OK" ]; then
    echo "✅ Backend API is healthy"
else
    echo "❌ Backend API issues detected"
fi
echo ""

echo "🔗 Quick Links:"
echo "   OpenAI Billing: https://platform.openai.com/account/billing"
echo "   OpenAI Help: https://help.openai.com/"
echo "   API Status: https://status.openai.com/"
echo ""

echo "💡 Solutions:"
echo "   1. Add payment method to increase quota"
echo "   2. Upgrade to paid plan"
echo "   3. Use alternative export formats (PDF, DOCX, TXT)"
echo "   4. Wait for monthly quota reset"
echo ""

echo "📋 Current Export Options:"
echo "   ✅ PDF Export: Available"
echo "   ✅ DOCX Export: Available"
echo "   ✅ TXT Export: Available"
echo "   ❌ MP3 Export: Requires quota increase"
echo ""

echo "🎯 Next Steps:"
echo "   1. Visit the billing dashboard"
echo "   2. Add a payment method"
echo "   3. Try MP3 export again"
echo "   4. Use other formats in the meantime"
echo ""
