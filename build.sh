#!/bin/bash

echo "Installing production dependencies..."
npm ci

echo "Building frontend..."
npm run build

echo "Build complete!"
