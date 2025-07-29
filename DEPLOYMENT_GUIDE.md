# 🚀 Production Deployment Guide

## 📋 **Pre-Deployment Checklist**

### **1. Environment Setup**
```bash
# Create production environment file
cp env.example .env.production

# Set production environment variables
NODE_ENV=production
PORT=5001
FRONTEND_URL=https://yourdomain.com
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
SESSION_SECRET=your-super-secure-session-secret-at-least-32-characters
OPENAI_API_KEY=sk-your-openai-api-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### **2. Security Validation**
```bash
# Test environment validation
node -e "require('./utils/envValidator').validateEnvironment()"

# Run security audit
npm audit

# Check for vulnerabilities
npm audit fix
```

### **3. Database Preparation**
```bash
# Ensure MongoDB is running and accessible
# Set up database indexes
# Configure backup strategy
# Test database connection
```

## 🔧 **Deployment Steps**

### **Step 1: Server Preparation**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install nginx (if using nginx)
sudo apt install nginx -y
```

### **Step 2: Application Setup**
```bash
# Clone your repository
git clone https://github.com/yourusername/document-summarizer.git
cd document-summarizer

# Install dependencies
cd backend
npm install --production

# Create necessary directories
mkdir -p logs uploads

# Set proper permissions
chmod 755 logs uploads
```

### **Step 3: SSL Certificate (CRITICAL)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

### **Step 4: Nginx Configuration**
```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/document-summarizer

# Add the following configuration:
```

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Auth routes
    location /auth/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Billing routes
    location /billing/ {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend static files
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/document-summarizer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 5: PM2 Configuration**
```bash
# Create PM2 ecosystem file
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'document-summarizer-api',
    script: 'server.production.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### **Step 6: Start Application**
```bash
# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

### **Step 7: Frontend Deployment**
```bash
# Build frontend for production
cd ../frontend
npm install
npm run build

# Copy build files to nginx directory
sudo cp -r build/* /var/www/html/

# Set proper permissions
sudo chown -R www-data:www-data /var/www/html/
sudo chmod -R 755 /var/www/html/
```

## 🔍 **Post-Deployment Verification**

### **1. Health Checks**
```bash
# Test API health
curl https://yourdomain.com/health

# Test frontend
curl https://yourdomain.com

# Check SSL certificate
curl -I https://yourdomain.com
```

### **2. Log Monitoring**
```bash
# Monitor application logs
pm2 logs document-summarizer-api

# Monitor nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Monitor system logs
sudo journalctl -u nginx -f
```

### **3. Performance Testing**
```bash
# Test API endpoints
curl -X POST https://yourdomain.com/api/process-document-guest \
  -F "document=@test.pdf" \
  -F "summarySize=short"

# Test authentication
curl -X GET https://yourdomain.com/auth/google
```

## 🛠️ **Maintenance Commands**

### **Application Management**
```bash
# Restart application
pm2 restart document-summarizer-api

# View application status
pm2 status

# Monitor resources
pm2 monit

# View logs
pm2 logs document-summarizer-api
```

### **Nginx Management**
```bash
# Reload nginx configuration
sudo nginx -t && sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# Check nginx status
sudo systemctl status nginx
```

### **SSL Certificate Renewal**
```bash
# Manual renewal
sudo certbot renew

# Check renewal status
sudo certbot certificates
```

## 🚨 **Emergency Procedures**

### **Application Crash**
```bash
# Restart application
pm2 restart document-summarizer-api

# Check logs for errors
pm2 logs document-summarizer-api --err

# Restart with fresh environment
pm2 delete document-summarizer-api
pm2 start ecosystem.config.js
```

### **Database Issues**
```bash
# Check MongoDB connection
mongo --eval "db.runCommand('ping')"

# Restart MongoDB
sudo systemctl restart mongod

# Check MongoDB logs
sudo journalctl -u mongod -f
```

### **SSL Certificate Issues**
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates

# Restart nginx
sudo systemctl restart nginx
```

## 📊 **Monitoring Setup**

### **1. Basic Monitoring**
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Monitor system resources
htop
iotop
nethogs
```

### **2. Log Rotation**
```bash
# Configure logrotate for application logs
sudo nano /etc/logrotate.d/document-summarizer

# Add configuration:
/var/www/document-summarizer/backend/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
```

### **3. Backup Strategy**
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="your-mongodb-uri" --out="/backup/mongodb_$DATE"
tar -czf "/backup/mongodb_$DATE.tar.gz" "/backup/mongodb_$DATE"
rm -rf "/backup/mongodb_$DATE"
```

## 🎯 **Success Metrics**

### **Performance Targets**
- [ ] API response time < 2 seconds
- [ ] 99.9% uptime
- [ ] SSL certificate valid
- [ ] All health checks passing
- [ ] Error rate < 1%

### **Security Checklist**
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] Security headers present
- [ ] No vulnerabilities detected
- [ ] Environment variables secure

### **Monitoring Checklist**
- [ ] Logs being generated
- [ ] Error tracking active
- [ ] Performance monitoring working
- [ ] Alerts configured
- [ ] Backups scheduled

---

**🚀 Your application is now ready for production!** 