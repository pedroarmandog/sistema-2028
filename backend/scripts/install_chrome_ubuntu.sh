#!/usr/bin/env bash
set -euo pipefail

echo "Instalando dependências e Google Chrome (stable)..."
sudo apt-get update
sudo apt-get install -y wget gnupg ca-certificates apt-transport-https \
  fonts-liberation libappindicator3-1 xdg-utils libxss1 libatk1.0-0 \
  libatk-bridge2.0-0 libcups2 libnss3 libxcomposite1 libxdamage1 \
  libxrandr2 libgtk-3-0 libx11-xcb1 libdbus-1-3 libxtst6 libgconf-2-4 libasound2

# Add Google signing key and repo (modern method)
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor -o /usr/share/keyrings/google-linux-signing-keyring.gpg
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-linux-signing-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list

sudo apt-get update
sudo apt-get install -y google-chrome-stable

echo "Instalação concluída. Caminho do binário:"
which google-chrome-stable || which google-chrome || echo "não encontrado"

echo "Versão instalada:"
google-chrome-stable --version || google-chrome --version || true
