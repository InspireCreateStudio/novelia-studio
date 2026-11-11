#!/usr/bin/env bash
# Construye la versión publicada en Cloudflare Pages:
# copia la app a dist/, comprime JS y CSS con esbuild y añade el aviso de derechos.
set -euo pipefail
AVISO="/*! © 2026 Inspire & Create Studio. Todos los derechos reservados. Prohibida su copia, modificación o distribución sin permiso. */"
ESBUILD="${ESBUILD:-npx --yes esbuild@0.28.2}"
rm -rf dist && mkdir dist
# Todo lo publicable (sin la carpeta .git, el propio script ni dist)
find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.github' ! -name 'dist' ! -name 'build.sh' ! -name 'README.md' ! -name 'node_modules' -exec cp -r {} dist/ \;
cd dist
find . -name '*.js' -o -name '*.css' | while read -r f; do
  $ESBUILD "$f" --minify --legal-comments=none --charset=utf8 --log-level=warning --outfile="$f.min"
  { echo "$AVISO"; cat "$f.min"; } > "$f"; rm "$f.min"
done
echo "Listo: $(find . -type f | wc -l) archivos en dist/"
