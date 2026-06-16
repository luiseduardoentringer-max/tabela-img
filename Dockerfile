# Imagem oficial do Puppeteer: já vem com Chromium + todas as libs de sistema.
# Evita a dor de instalar dependências do Chrome manualmente.
FROM ghcr.io/puppeteer/puppeteer:23.0.0

# o usuário 'pptruser' já vem configurado na imagem
WORKDIR /app

# instala dependências
COPY package.json ./
RUN npm install --omit=dev

# copia o código
COPY src ./src

# o Puppeteer da imagem oficial já aponta pro Chromium instalado
ENV PUPPETEER_SKIP_DOWNLOAD=true

EXPOSE 3000
CMD ["node", "src/server.js"]
