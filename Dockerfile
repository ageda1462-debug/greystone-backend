FROM node:20-slim

RUN apt-get update && apt-get install -y python3 python3-pip curl && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    yt-dlp --update-to nightly

WORKDIR /app
COPY package*.json ./
ENV YOUTUBE_DL_SKIP_PYTHON_CHECK=1
RUN npm install
COPY . .

RUN yt-dlp --install-js-runtime nodejs

EXPOSE 8080
CMD ["node", "server.js"]