FROM node:8.7.0

ENV NPM_CONFIG_LOGLEVEL warn

COPY . .

RUN npm install

RUN npm run build --production

RUN npm install -g serve

COPY ./reciever.html bundle/

CMD serve -s bundle

EXPOSE 5000
