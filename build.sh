#!/bin/bash

set -e

BUILD_FOLDER_CJS="cjs"
BUILD_FOLDER_ESM="esm"
EXTENSIONS=".js,.jsx,.ts,.tsx"
NODE_MODULES=node_modules
SRC_FOLDER="src"
START_TIME=$(date +%s)

SRC_FILES=`find ${SRC_FOLDER} -type f -name "*.spec.*" -o -name '*.testUtils.*'`

echo "removing ${BUILD_FOLDER_CJS} directory"
rm -rf ${BUILD_FOLDER_CJS}/*

echo "removing ${BUILD_FOLDER_ESM} directory"
rm -rf ${BUILD_FOLDER_ESM}/*

echo "building worker"
eval npm run build:worker 2>&1 &

wait

echo "building types"
$(npm bin)/tsc --emitDeclarationOnly 2>&1
$(npm bin)/tsc --emitDeclarationOnly --declarationDir	esm 2>&1

echo "building ${BUILD_FOLDER_CJS}"
eval NODE_ENV="${NODE_ENV}" node node_modules/@babel/cli/lib/babel/index.js ${SRC_FOLDER} --out-dir ${BUILD_FOLDER_CJS} --extensions ${EXTENSIONS} --source-maps inline 2>&1 &

echo "building ${BUILD_FOLDER_ESM}"
eval NODE_ENV="${NODE_ENV}" IS_ESM="true" node node_modules/@babel/cli/lib/babel/index.js ${SRC_FOLDER} --out-dir ${BUILD_FOLDER_ESM} --extensions ${EXTENSIONS} --source-maps inline 2>&1 &

wait

END_TIME=$(date +%s)

echo "build complete in $((END_TIME-START_TIME)) seconds!"


