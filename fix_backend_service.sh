#!/bin/bash

# Emergency fix script for backend service issues
echo "🔧 Emergency Fix Script for Backend Service"
echo "=========================================="

# Kill all existing uvicorn processes
echo "Killing all existing uvicorn processes..."
pkill -9 -f uvicorn || true
pkill -9 -f "app.main:app" || true

# Check if port 8000 is in use
echo "Checking if port 8000 is in use..."
PORT_IN_USE=$(lsof -i :8000 | grep LISTEN)
if [ ! -z "$PORT_IN_USE" ]; then
  echo "Port 8000 is in use by:"
  echo "$PORT_IN_USE"
  echo "Killing process..."
  PID=$(echo "$PORT_IN_USE" | awk '{print $2}')
  kill -9 $PID || true
fi

# Fix the systemd service file
echo "Creating proper systemd service file..."
cat > /tmp/crm-backend.service << 'EOF'
[Unit]
Description=Sunstone CRM Backend
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/var/www/crm-app/backend
ExecStart=/var/www/crm-app/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment="PYTHONPATH=/var/www/crm-app/backend"

[Install]
WantedBy=multi-user.target
EOF

# Install the service file
echo "Installing service file..."
sudo mv /tmp/crm-backend.service /etc/systemd/system/crm-backend.service

# Reload systemd
echo "Reloading systemd..."
sudo systemctl daemon-reload

# Restart the service
echo "Restarting the service..."
sudo systemctl restart crm-backend

# Check service status
echo "Service status:"
sudo systemctl status crm-backend --no-pager

echo ""
echo "=========================================="
echo "✅ Emergency fix applied!"
echo "=========================================="
echo ""
echo "If you're still having issues, try manually starting the backend with:"
echo "cd /var/www/crm-app/backend"
echo "source venv/bin/activate"
echo "uvicorn app.main:app --host 0.0.0.0 --port 8001"
echo ""
echo "This will start the backend on port 8001 for testing."
