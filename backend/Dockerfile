# VIPOR backend — container image for TrueNAS / any Docker host.
FROM node:22-alpine

WORKDIR /app

# install production deps first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# app source
COPY . .

# data lives on a mounted volume so it survives restarts/redeploys
ENV NODE_ENV=production \
    PORT=3001 \
    DATA_FILE=/data/vipor-db.json

EXPOSE 3001
CMD ["node", "server.js"]
