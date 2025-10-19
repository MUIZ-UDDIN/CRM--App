module.exports = {
  apps: [{
    name: 'crm-backend',
    script: './venv/bin/uvicorn',
    args: 'main:app --host 127.0.0.1 --port 8000 --workers 2',
    cwd: '/var/www/crm-app/crm-app/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/crm-backend-error.log',
    out_file: '/var/log/pm2/crm-backend-out.log',
    log_file: '/var/log/pm2/crm-backend.log',
    env: {
      NODE_ENV: 'production',
      ENV: 'production',
      PYTHONPATH: '/var/www/crm-app/crm-app/backend'
    }
  }]
}
