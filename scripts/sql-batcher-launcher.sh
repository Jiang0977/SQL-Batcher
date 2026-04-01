#!/bin/sh
set -eu

APP_DIR="$(CDPATH= cd -- "$(dirname "$0")" && pwd)"
APP_BIN="${SQL_BATCHER_BIN:-$APP_DIR/sql-batcher}"
RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
X11_SOCKET_DIR="${SQL_BATCHER_X11_DIR:-/tmp/.X11-unix}"
WAYLAND_GLOB="${SQL_BATCHER_WAYLAND_GLOB:-$RUNTIME_DIR/wayland-*}"
XAUTH_GLOB="${SQL_BATCHER_XAUTH_GLOB:-$RUNTIME_DIR/.mutter-Xwaylandauth.*}"

if [ -z "${WAYLAND_DISPLAY:-}" ]; then
  for candidate in $WAYLAND_GLOB; do
    if [ -e "$candidate" ]; then
      export WAYLAND_DISPLAY="$(basename "$candidate")"
      break
    fi
  done
fi

if [ -z "${DISPLAY:-}" ]; then
  for candidate in "$X11_SOCKET_DIR"/X*; do
    if [ -e "$candidate" ]; then
      display_num="${candidate##*/X}"
      export DISPLAY=":$display_num"
      break
    fi
  done
fi

if [ -z "${XAUTHORITY:-}" ]; then
  for candidate in $XAUTH_GLOB "$HOME/.Xauthority"; do
    if [ -r "$candidate" ]; then
      export XAUTHORITY="$candidate"
      break
    fi
  done
fi

if [ -n "${WAYLAND_DISPLAY:-}" ] && [ -z "${GDK_BACKEND:-}" ]; then
  export GDK_BACKEND="wayland"
fi

if [ -z "${ELECTRON_OZONE_PLATFORM_HINT:-}" ]; then
  export ELECTRON_OZONE_PLATFORM_HINT="auto"
fi

exec "$APP_BIN" --disable-gpu "$@"
