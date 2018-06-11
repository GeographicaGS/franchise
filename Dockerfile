FROM node:8.7.0

ENV NPM_CONFIG_LOGLEVEL warn

COPY . .

RUN npm install

RUN npm run build --production

CMD npm start

EXPOSE 5000
