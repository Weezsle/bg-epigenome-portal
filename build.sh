#!/bin/bash

set -e

# Whether to update the dev version (default: true)
# Usage: ./build.sh [dev]
#   ./build.sh       -> dev version (default)
#   ./build.sh dev   -> dev version
#   ./build.sh prod  -> production version
DEV=true
if [ "$1" = "prod" ]; then
  DEV=false
fi

cd ./src

[ ! -d "node_modules" ] && npm install

npm run build

cd ../
if [ "$DEV" = true ]; then
  rm -rf ./docs/dev
  mv ./src/dist ./docs/dev
else
  rm -rf ./docs
  mv ./src/dist ./docs
  ECHO "basalganglia.epigenomes.net" > docs/CNAME
fi

git add docs
git add src



