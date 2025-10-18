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
    env: {
      NODE_ENV: 'production'
    }
  }]
}
