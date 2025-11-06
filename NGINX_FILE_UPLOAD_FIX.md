# Fix 413 Request Entity Too Large Error

## Problem
When uploading files larger than 1MB, Nginx returns:
```
413 Request Entity Too Large
```

## Root Cause
Nginx has a default `client_max_body_size` of 1MB. Files larger than this are rejected before reaching the backend.

## Solution
Update Nginx configuration to allow larger file uploads (up to 50MB).

## Deployment Steps

### 1. SSH to Server
```bash
ssh root@srv1066728
```

### 2. Edit Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/crm-app
```

### 3. Add client_max_body_size Directive
Add this line inside the `server` block (before or after `location` blocks):

```nginx
server {
    listen 80;
    server_name sunstonecrm.com www.sunstonecrm.com;

    # Allow file uploads up to 50MB
    client_max_body_size 50M;

    # Frontend
    location / {
        root /var/www/crm-app/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Allow large file uploads for API
        client_max_body_size 50M;
    }
}
```

### 4. Test Nginx Configuration
```bash
sudo nginx -t
```

Should output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. Reload Nginx
```bash
sudo systemctl reload nginx
```

### 6. Verify
Upload a file larger than 1MB but less than 50MB. Should work now!

## Alternative: Global Configuration
If you want to set this globally for all sites:

```bash
sudo nano /etc/nginx/nginx.conf
```

Add inside the `http` block:
```nginx
http {
    # ... other settings ...
    
    client_max_body_size 50M;
    
    # ... rest of config ...
}
```

Then reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Verification
1. Go to Files page
2. Upload a file between 1MB and 50MB
3. Should upload successfully without 413 error

## Notes
- `client_max_body_size 50M;` allows uploads up to 50 megabytes
- Can be set per server block or globally in http block
- Backend also has MAX_FILE_SIZE=50MB in .env (already configured)
- This fixes the Nginx layer; backend already supports 50MB
