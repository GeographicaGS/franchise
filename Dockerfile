FROM node:8.7.0

ENV NPM_CONFIG_LOGLEVEL warn

COPY . .

RUN npm run build --production

RUN npm install -g serve

CMD serve

EXPOSE 5000