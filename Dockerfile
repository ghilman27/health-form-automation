FROM node:14.17.5-alpine AS ts-compiler
WORKDIR /usr/app
COPY package.json ./
COPY tsconfig*.json ./
RUN npm install --no-package-lock
COPY . ./
RUN npm run build

FROM node:14.17.5-alpine AS ts-remover
WORKDIR /usr/app
ENV NODE_ENV=production
COPY --from=ts-compiler /usr/app/package.json ./
RUN npm install --only=production --no-package-lock
COPY --from=ts-compiler /usr/app/build ./build
RUN mkdir build/screenshots
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD npm run start
