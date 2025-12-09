#!/bin/bash

DO_SERVE=false
DO_PUSH=false

# Parse flags
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --serve|-s)
            DO_SERVE=true
            ;;
        --push|-p)
            DO_PUSH=true
            ;;
            *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
    shift
done

rsync -av --exclude '.*' --exclude '_*' --delete "$CONTENT_SOURCE" content/

if [ "$DO_SERVE" = true ]; then
	npx quartz build --serve
else
	npx quartz build
fi

if [ "$DO_PUSH" = true ]; then
	npx quartz sync
fi
