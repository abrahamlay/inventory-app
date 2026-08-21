# ===== Stage 1: Build React =====
FROM docker.io/library/node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Base path untuk deployment (sub-path atau root)
ARG BASE_PATH=/inventory-app/
ENV VITE_BASE_PATH=${BASE_PATH}

RUN npm run build

# ===== Stage 2: Serve dengan Nginx =====
FROM docker.io/library/nginx:alpine

# Template config (di-envsubst otomatis oleh image resmi nginx)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Hasil build ditaruh di folder tetap; prefix URL diatur via BASE_PATH
COPY --from=build /app/dist /usr/share/nginx/inventory

EXPOSE 80