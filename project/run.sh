#!/bin/sh

GOOS=js GOARCH=wasm go build ./src/wasm/ -o ./dist/main.wasm

npm run start