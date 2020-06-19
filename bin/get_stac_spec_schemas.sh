#!/usr/bin/env bash

if [[ ! -d stac-spec ]]; then
  echo "Cloning stac-spec"
  git clone "https://github.com/radiantearth/stac-spec.git"
  if [[ $? != 0 ]]; then
    echo 'git clone failed'
    exit 1
  fi
fi
cd stac-spec
git checkout 37ff5fe75f3639e25d452f483a2c84a7c34374bf
if [[ $? != 0 ]]; then
  echo 'git checkout failed'
  exit 1
fi
cd ..

compile_schema() {
  node bin/compile_schema.js $1 $2
  if [[ $? != 0 ]]; then
    echo 'Compilation failed'
    exit 1
  fi
}

compile_schema stac-spec/item-spec/json-schema/item.json search/docs/item.json
compile_schema stac-spec/catalog-spec/json-schema/catalog.json search/docs/catalog.json
compile_schema stac-spec/collection-spec/json-schema/collection.json search/docs/collection.json
compile_schema docs/schemas/collections.json search/docs/collections.json
compile_schema docs/schemas/items.json search/docs/items.json
