#!/bin/bash
# Script: configurar nginx para pethubflow.com.br
# Execute no SSH da VPS: bash setup-nginx-pethubflow.sh

set -e

echo "🔍 Verificando certificado SSL..."
if [ -d "/etc/letsencrypt/live/pethubflow.com.br" ]; then
  echo "✅ Certificado encontrado"
  SSL_OK=true
else
  echo "⚠️ Certificado não encontrado — será configurado sem SSL primeiro"
  SSL_OK=false
fi

echo "📝 Criando config nginx..."

if [ "$SSL_OK" = true ]; then
cat > /etc/nginx/sites-enabled/pethubflow << 'EOF'
server {
    listen 80;
    server_name pethubflow.com.br www.pethubflow.com.br;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name pethubflow.com.br www.pethubflow.com.br;

    ssl_certificate /etc/letsencrypt/live/pethubflow.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pethubflow.com.br/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location / {
        if ($request_method = OPTIONS) {
            add_header 'Access-Control-Allow-Origin' $http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization, X-Requested-With, Cache-Control' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Content-Length' '0';
            return 204;
        }

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF
else
cat > /etc/nginx/sites-enabled/pethubflow << 'EOF'
server {
    listen 80;
    server_name pethubflow.com.br www.pethubflow.com.br;

    location / {
        if ($request_method = OPTIONS) {
            add_header 'Access-Control-Allow-Origin' $http_origin always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Origin, Content-Type, Accept, Authorization, X-Requested-With, Cache-Control' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;
            add_header 'Content-Length' '0';
            return 204;
        }

        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_buffering off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF
fi

echo "🧪 Testando config nginx..."
nginx -t

echo "🔄 Recarregando nginx..."
nginx -s reload

echo ""
echo "✅ Pronto! Aguarde 10 segundos e acesse https://pethubflow.com.br/"

if [ "$SSL_OK" = false ]; then
  echo ""
  echo "⚠️  Para ativar HTTPS, rode:"
  echo "certbot --nginx -d pethubflow.com.br -d www.pethubflow.com.br"
fi
