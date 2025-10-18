module.exports = {
  apps: [{
    name: 'crm-backend',
    script: 'main.py',
    interpreter: './venv/bin/python',
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
      PYTHONPATH: '/var/www/crm-app/crm-app/backend'
    }
  }]
}
