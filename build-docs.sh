#!/bin/bash


base_dir="$(cd "$(dirname "$0")"; pwd)"
builder_path="/Users/davidhanna/aws/ks/ks-client-documentation"

cd "${builder_path}" && \
    NODE_ENV=development node src/index.js \
    --config-file "${base_dir}/config/${1}-config.json" \
    --output-folder "${base_dir}/site/${1}/" \
    --markdown-template-folder "${builder_path}/templates/markdown/" \
    --overwrite-markdown false