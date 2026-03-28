#!/bin/bash
set -e
mkdir -p data/gtfs
cd data/gtfs
if [ ! -f stops.txt ]; then
  echo "Downloading MTA GTFS static feed..."
  curl -L -o gtfs.zip "http://web.mta.info/developers/data/nyct/subway/google_transit.zip"
  unzip -o gtfs.zip
  rm gtfs.zip
  echo "GTFS data downloaded and extracted."
else
  echo "GTFS data already exists, skipping download."
fi
