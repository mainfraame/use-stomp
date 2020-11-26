#!/bin/bash

set -e

BUILD_CLEAN=false
BUILD_CMD=""
BUILD_DIST=false
BUILD_FOLDER_CJS="cjs"
BUILD_FOLDER_ESM="esm"
BUILD_STYLEGUIDIST=false;
EXTENSIONS=".js,.jsx,.ts,.tsx"
FLAGS=$( IFS=$' '; echo "${@}" )
NODE_MODULES=node_modules
PACK=false
PACKAGE_LOCK=package-lock.json
SRC_FOLDER="src"
START_TIME=$(date +%s)

LINK_LOCALLY=false

function join {
    local IFS="$1";
    shift;
    echo "$*";
}

SRC_FILES=`find ${SRC_FOLDER} -type f -name "*.spec.*" -o -name '*.testUtils.*'`
IGNORE_FILES=$(join , ${SRC_FILES})

if [[ "$IGNORE_FILES" == "" ]]; then
    IGNORE_FILES_CMD=""
else
    IGNORE_FILES_CMD="--ignore ${IGNORE_FILES}"
fi

if [[ "${FLAGS}" == *"-build"* ]]; then
    BUILD_DIST=true;
fi

if [[ "${FLAGS}" == *"-clean"* ]]; then
    BUILD_CLEAN=true;
fi

if [[ "${FLAGS}" == *"-styleguidist"* ]]; then
    BUILD_STYLEGUIDIST=true;
fi

if [[ "${FLAGS}" == *"-pack"* ]]; then
    PACK=true;
fi

if [[ "${FLAGS}" == *"-link"* ]]; then
    LINK_LOCALLY=true
fi

if [ "$BUILD_CLEAN" = true ] ; then

    if test -f "$PACKAGE_LOCK"; then
        echo "removing package-lock.json"
        rm ${PACKAGE_LOCK}
    fi

    if [ -d "$NODE_MODULES" ]; then
        echo "removing node_modules"
        rm -rf ${NODE_MODULES}
    fi

    npm i 2>&1
fi

if [ "$BUILD_DIST" = true ] ; then

    if [ "$LINK_LOCALLY" = false ] ; then

        echo "removing ${BUILD_FOLDER_CJS} directory"
        rm -rf ${BUILD_FOLDER_CJS}/*

        echo "removing ${BUILD_FOLDER_ESM} directory"
        rm -rf ${BUILD_FOLDER_ESM}/*
    fi

    echo "building types"
    $(npm bin)/tsc --emitDeclarationOnly 2>&1
    $(npm bin)/tsc --emitDeclarationOnly --declarationDir	esm 2>&1

    echo "building ${BUILD_FOLDER_CJS}"
    eval NODE_ENV="${NODE_ENV}" node node_modules/@babel/cli/lib/babel/index.js ${SRC_FOLDER} --out-dir ${BUILD_FOLDER_CJS} --extensions ${EXTENSIONS} --source-maps inline ${IGNORE_FILES_CMD} ${BUILD_CMD} 2>&1 &

    echo "building ${BUILD_FOLDER_ESM}"
    eval NODE_ENV="${NODE_ENV}" IS_ESM="true" node node_modules/@babel/cli/lib/babel/index.js ${SRC_FOLDER} --out-dir ${BUILD_FOLDER_ESM} --extensions ${EXTENSIONS} --source-maps inline ${IGNORE_FILES_CMD} ${BUILD_CMD} 2>&1 &
fi

wait

#echo "moving types to match build structure"
#node build.js 2>&1

#if [ "$LINK_LOCALLY" = true ] ; then
#    echo "linking module locally"
#    npm link
#fi

# if [ "${BUILD_STYLEGUIDIST}" = true ] ; then
#
#     echo "building styleguidist"
#     $(npm bin)/styleguidist build 2>&1 &
#
#     wait
# fi

if [ "$PACK" = true ] ; then
    echo "packaging tgz"
    npm pack 2>&1
fi

END_TIME=$(date +%s)

echo "build complete in $((END_TIME-START_TIME)) seconds!"


