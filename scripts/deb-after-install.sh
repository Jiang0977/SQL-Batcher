#!/bin/sh
set -eu

DESKTOP_FILE="/usr/share/applications/sql-batcher.desktop"
WRAPPER="/opt/SQL-Batcher/sql-batcher-launcher.sh"
SANDBOX="/opt/SQL-Batcher/chrome-sandbox"
LEGACY_DIR="/opt/SQL Batcher"
LEGACY_BIN="$LEGACY_DIR/sql-batcher"

if [ -f "$DESKTOP_FILE" ]; then
  sed -i "s|^Exec=.*|Exec=$WRAPPER %U|" "$DESKTOP_FILE"
fi

if [ -f "$SANDBOX" ]; then
  chown root:root "$SANDBOX"
  chmod 4755 "$SANDBOX"
fi

mkdir -p "$LEGACY_DIR"
cat > "$LEGACY_BIN" <<EOF
#!/bin/sh
exec "$WRAPPER" "\$@"
EOF
chmod 755 "$LEGACY_BIN"

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database /usr/share/applications >/dev/null 2>&1 || true
fi
