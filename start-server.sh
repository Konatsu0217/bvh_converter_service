#!/usr/bin/env bash
set -euo pipefail

MODE="prod"
PORT_ARG="25533"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      MODE="dev"
      shift
      ;;
    --prod)
      MODE="prod"
      shift
      ;;
    --port|-p)
      PORT_ARG="$2"
      shift 2
      ;;
    *)
      if [[ -z "$PORT_ARG" && "$1" =~ ^[0-9]+$ ]]; then
        PORT_ARG="$1"
      fi
      shift
      ;;
  esac
done

if [[ -n "$PORT_ARG" ]]; then
  export PORT="$PORT_ARG"
elif [[ -n "${PORT:-}" ]]; then
  export PORT
fi

if [[ "$MODE" == "dev" ]]; then
  exec yarn dev
else
  if [[ ! -f ".next/BUILD_ID" ]]; then
    yarn build
  fi
  exec yarn start
fi
