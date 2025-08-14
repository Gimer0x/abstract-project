# OpenAI TTS Quota Increase Guide

## 🚨 Current Issue
Your OpenAI Text-to-Speech (TTS) service has exceeded its quota, causing MP3 export failures.

## 🔧 Quick Solutions

### **Option 1: Add Payment Method (Recommended)**
1. **Visit**: https://platform.openai.com/account/billing
2. **Click**: "Add payment method"
3. **Enter**: Your credit card information
4. **Result**: Quota increases immediately

### **Option 2: Upgrade to Paid Plan**
1. **Visit**: https://platform.openai.com/account/billing
2. **Click**: "Upgrade" or "Manage subscription"
3. **Choose**:
   - **Pay-as-you-go**: No monthly fee, pay per usage
   - **Team Plan**: $20/month per user
   - **Enterprise**: Custom pricing

### **Option 3: Request Quota Increase**
1. **Visit**: https://platform.openai.com/account/billing
2. **Look for**: "Quota increase" or "Request increase"
3. **Fill out**: Form explaining your use case
4. **Wait**: 1-3 business days for approval

## 💰 TTS Pricing (2024)

| Model | Price per 1K characters | Quality |
|-------|------------------------|---------|
| TTS-1 | $0.015 | Standard |
| TTS-1-HD | $0.030 | High Definition |

**Example Costs:**
- 1,000 character summary ≈ $0.015
- 5,000 character summary ≈ $0.075
- 10,000 character summary ≈ $0.15

## 🔄 Alternative Solutions

### **Use Other Export Formats**
- ✅ **PDF Export**: Working
- ✅ **DOCX Export**: Working
- ✅ **TXT Export**: Working
- ❌ **MP3 Export**: Temporarily unavailable

### **Monitor TTS Status**
```bash
curl http://localhost:5001/health/tts
```

### **Fallback Service**
The application now includes a fallback TTS service that activates when OpenAI quota is exceeded.

## 📋 Step-by-Step Resolution

### **Immediate Actions:**
1. **Check current usage**: Visit billing dashboard
2. **Add payment method**: If none exists
3. **Upgrade plan**: If on free tier
4. **Wait for reset**: If monthly quota exceeded

### **Long-term Solutions:**
1. **Monitor usage**: Track TTS consumption
2. **Optimize text length**: Shorter summaries use less quota
3. **Consider alternatives**: Use PDF/DOCX for most exports
4. **Set up alerts**: Configure usage notifications

## 🆘 Troubleshooting

### **Common Issues:**
- **"Insufficient quota"**: Add payment method
- **"Rate limit exceeded"**: Wait and retry
- **"Invalid API key"**: Check environment variables
- **"Service unavailable"**: Check OpenAI status page

### **Support Resources:**
- **OpenAI Help**: https://help.openai.com/
- **Billing Support**: https://platform.openai.com/account/billing
- **API Status**: https://status.openai.com/

## 📊 Usage Monitoring

### **Check Current Usage:**
```bash
# Check TTS service status
curl http://localhost:5001/health/tts

# Check overall API health
curl http://localhost:5001/health
```

### **Environment Variables:**
Make sure your `.env` file has:
```env
OPENAI_API_KEY=your_api_key_here
```

## 🎯 Best Practices

1. **Start with free tier**: Test functionality
2. **Monitor usage**: Track consumption patterns
3. **Use appropriate formats**: PDF for documents, MP3 for audio
4. **Implement fallbacks**: Have alternative export options
5. **Set budgets**: Configure spending limits

## 📞 Need Help?

If you continue experiencing issues:
1. Check OpenAI's status page
2. Review your billing dashboard
3. Contact OpenAI support
4. Use alternative export formats temporarily

---

**Note**: This guide is updated as of 2024. OpenAI pricing and policies may change.
