#! /bin/sh

# More info -> https://github.com/CartoDB/solutions/blob/master/doc/source/technical/deploying-to-cartoio.rst

APP_NAME="franchise-master"
BRANCH_NAME="master"

git remote remove dokku
git remote add dokku dokku@carto.io:$APP_NAME
git push origin $BRANCH_NAME
ssh dokku@carto.io apps:destroy $APP_NAME
git push dokku $BRANCH_NAME:master
ssh dokku@carto.io certs:add $APP_NAME /home/dokku/tls/server.crt /home/dokku/tls/server.key
ssh dokku@carto.io proxy:ports-add $APP_NAME https:443:5000
