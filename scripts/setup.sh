#!/usr/bin/env bash
set -euo pipefail

if [[ "$EUID" -ne 0 ]]; then
    echo "Run using: sudo bash scripts/setup.sh"
    exit 1
fi

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
WEBROOT="/var/www/course-portal"
SITE_CONFIG="/etc/nginx/sites-available/course-portal"

if [[ ! -f "$PROJECT_DIR/public/index.html" ]]; then
    echo "ERROR: public/index.html is missing."
    exit 1
fi

if [[ ! -f "$PROJECT_DIR/nginx/course-portal.conf.template" ]]; then
    echo "ERROR: Nginx configuration template is missing."
    exit 1
fi

BACKEND_PRIVATE_IP="${BACKEND_PRIVATE_IP:-}"

if [[ -z "$BACKEND_PRIVATE_IP" ]]; then
    read -r -p "Backend EC2 private IP [172.31.5.147]: " BACKEND_PRIVATE_IP
    BACKEND_PRIVATE_IP="${BACKEND_PRIVATE_IP:-172.31.5.147}"
fi

if [[ ! "$BACKEND_PRIVATE_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
    echo "ERROR: Enter a valid IPv4 address."
    exit 1
fi

# Install the web server and deployment utility.
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx rsync

# Deploy website files from the repository.
mkdir -p "$WEBROOT"
rsync -a --delete "$PROJECT_DIR/public/" "$WEBROOT/"
chown -R www-data:www-data "$WEBROOT"

# Render the Nginx configuration for this backend.
sed "s/__BACKEND_PRIVATE_IP__/${BACKEND_PRIVATE_IP}/g" \
    "$PROJECT_DIR/nginx/course-portal.conf.template" > "$SITE_CONFIG"

if grep -q '__BACKEND_PRIVATE_IP__' "$SITE_CONFIG"; then
    echo "ERROR: Backend placeholder remains in Nginx configuration."
    exit 1
fi

# Enable this site and disable the default site.
ln -sfn "$SITE_CONFIG" /etc/nginx/sites-enabled/course-portal
rm -f /etc/nginx/sites-enabled/default

# Validate before reloading the web server.
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl start nginx

echo
echo "========================================"
echo "Frontend deployment completed."
echo "Website root: $WEBROOT"
echo "Backend:      $BACKEND_PRIVATE_IP:8000"
echo "========================================"
