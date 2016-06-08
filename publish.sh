#!/bin/sh

VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Need to set version"
    exit 1
fi

set -ex

npm test

gulp build

sed -i -E "s/\"version\": \"[^\"]+\"/\"version\": \"$VERSION\"/" package.json

npm publish
