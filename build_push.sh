#!/bin/bash
rsync -av --delete $CONTENT_SOURCE content/
npx quartz build
npx quartz sync
