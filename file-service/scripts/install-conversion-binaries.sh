#!/bin/sh
set -eu

echo "[conversion] Installing system binaries..."

if command -v apt-get >/dev/null 2>&1; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update
  # Minimal set for DOCX/PPTX -> PDF (soffice) + PDF -> images (pdftoppm)
  # Avoid installing full libreoffice meta-package to keep image smaller.
  apt-get install -y --no-install-recommends \
    libreoffice-core \
    libreoffice-common \
    libreoffice-writer \
    libreoffice-impress \
    fonts-dejavu-core \
    poppler-utils \
    ca-certificates
  apt-get clean
  rm -rf /var/lib/apt/lists/*
elif command -v apk >/dev/null 2>&1; then
  apk add --no-cache \
    libreoffice \
    poppler-utils \
    ca-certificates
else
  echo "[conversion] Unsupported package manager. Install 'libreoffice' and 'poppler-utils' manually." >&2
  exit 1
fi

echo "[conversion] Checking binaries..."
soffice --version >/dev/null 2>&1 || {
  echo "[conversion] ERROR: soffice not found after installation" >&2
  exit 1
}
pdftoppm -v >/dev/null 2>&1 || {
  echo "[conversion] ERROR: pdftoppm not found after installation" >&2
  exit 1
}

echo "[conversion] Binaries installed successfully."
