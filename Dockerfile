FROM node:8.7.0

ENV NPM_CONFIG_LOGLEVEL warn

RUN npm install -g serve

COPY package.json .

RUN npm install

COPY . .

RUN npm run build --production

COPY ./reciever.html bundle/

CMD serve -s bundle

EXPOSE 5000
