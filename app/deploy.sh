#!/bin/sh
# Build the Flutter web app and stage it into docs/ (GitHub Pages source).
set -e
cd "$(dirname "$0")"
flutter build web --release --base-href /ccaf-drill/
rm -rf ../docs
mkdir ../docs
cp -R build/web/* ../docs/
touch ../docs/.nojekyll
echo "docs/ staged — commit and push to deploy"
