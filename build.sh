#!/bin/bash

echo "Installing production dependencies..."
npm ci --omit=dev

echo "Building frontend..."
npm run build

echo "Build complete!"
