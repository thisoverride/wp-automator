sudo apt-get update && sudo apt-get install gnupg wget -y && \
sudo wget --quiet --output-document=- https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo gpg --dearmor | sudo tee /etc/apt/trusted.gpg.d/google-archive.gpg > /dev/null && \
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' && \
sudo apt-get update && sudo apt-get install google-chrome-stable -y --no-install-recommends && \
sudo rm -rf /var/lib/apt/lists/*
