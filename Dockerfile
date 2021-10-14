FROM node:14.17.5-alpine AS ts-compiler
WORKDIR /usr/app
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm install
COPY . ./
RUN npm run build

FROM node:14.17.5-alpine AS ts-remover
WORKDIR /usr/app
ENV NODE_ENV=production
COPY --from=ts-compiler /usr/app/package*.json ./
COPY --from=ts-compiler /usr/app/build ./
RUN npm install --only=production

FROM gcr.io/distroless/nodejs:14
WORKDIR /usr/app
COPY --from=ts-remover /usr/app ./
USER 1000
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["build/src/main.js"]
