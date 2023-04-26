FROM node:16-alpine

ENV NODE_ENV=production

RUN mkdir /service-by-me/service-by-me
WORKDIR /service-by-me

COPY package.json package-lock.json ./

RUN npm install --production

COPY . .

CMD ["npm", "start"]
