#!/usr/bin/env bash
set -Eeuo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Run with: sudo bash ~/predeploy-frontend.sh"
    exit 1
fi

if ! grep -qi ubuntu /etc/os-release; then
    echo "ERROR: This script is intended for Ubuntu."
    exit 1
fi

echo "=== Updating package indexes ==="
apt-get update

echo "=== Installing frontend prerequisites ==="
DEBIAN_FRONTEND=noninteractive apt-get install -y \
    nginx \
    git \
    rsync \
    curl \
    ca-certificates

echo "=== Preparing application webroot ==="
install -d -o www-data -g www-data -m 0755 \
    /var/www/course-portal

echo "=== Enabling Nginx ==="
systemctl enable --now nginx

echo "=== Validating Nginx ==="
nginx -t

echo
echo "FRONTEND PRE-DEPLOYMENT COMPLETE"
echo "Webroot: /var/www/course-portal"
echo "Nginx config to create during deployment:"
echo "/etc/nginx/sites-available/course-portal"
echo
echo "Nginx status:"
systemctl --no-pager --full status nginx || true
