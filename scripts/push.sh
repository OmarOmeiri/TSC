#!/usr/bin/env bash

date=$(date '+%Y-%m-%d')
git add .
git commit -m"$date"
git push origin master