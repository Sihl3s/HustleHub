# API image. Certificates are created at start and are not copied from the host.
FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p certs && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV BIND_HOST=0.0.0.0
ENV PORT=3443

EXPOSE 3443

CMD ["sh", "-c", "node scripts/generate-certs.js && node src/server.js"]
