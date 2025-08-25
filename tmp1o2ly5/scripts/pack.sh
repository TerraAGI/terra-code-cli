#!/bin/bash

# Build the packages first
npm run build:packages

# Pack CLI package
cd packages/cli && npm pack && cd ../../

# Pack Core package  
cd packages/core && npm pack && cd ../../

# Move the tgz files to root directory using absolute paths
cp packages/cli/*.tgz ./
cp packages/core/*.tgz ./

# Remove the original files from package directories
rm packages/cli/*.tgz
rm packages/core/*.tgz

echo "Packages created successfully:"
ls -la *.tgz