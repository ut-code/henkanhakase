#!/usr/bin/env bash
# Mac App Store 向けに、LGPL 版の FFmpeg を静的リンクでビルドする。
#
# 使い方(macOS で実行する):
#   brew install pkg-config nasm
#   scripts/build-ffmpeg-lgpl-macos.sh
#
# 成果物は $WORK_DIR/out に出力される:
#   ffmpeg-<arch>-apple-darwin          … src-tauri/binaries に置くバイナリ
#   ffmpeg-lgpl-<version>-macos-src.tar.gz … 配布時にリリースへ添付する、対応するソースコード一式
#
# 環境変数で変更できるもの:
#   WORK_DIR                  作業ディレクトリ(既定: ~/ffmpeg-lgpl)
#   FFMPEG_VERSION            FFmpeg のバージョン(既定: 下記)
#   MACOSX_DEPLOYMENT_TARGET  対応する最小の macOS バージョン(既定: 11.0)
#   JOBS                      並列ビルド数(既定: CPU コア数)

set -euo pipefail

FFMPEG_VERSION="${FFMPEG_VERSION:-8.1}"
LIBVPX_VERSION=1.17.0
LAME_VERSION=3.100
OPUS_VERSION=1.6.1
LIBOGG_VERSION=1.3.5
LIBVORBIS_VERSION=1.3.7
LIBWEBP_VERSION=1.6.0

WORK_DIR="${WORK_DIR:-$HOME/ffmpeg-lgpl}"
export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-11.0}"

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
DOWNLOAD_DIR="$WORK_DIR/downloads"
SRC_DIR="$WORK_DIR/src"
PREFIX="$WORK_DIR/prefix"
OUT_DIR="$WORK_DIR/out"

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31mエラー: %s\033[0m\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------
# 事前チェック
# ------------------------------------------------------------

[[ "$(uname -s)" == "Darwin" ]] || fail "macOS で実行してください"

JOBS="${JOBS:-$(sysctl -n hw.ncpu)}"

case "$(uname -m)" in
  arm64) ARCH=aarch64 ;;
  x86_64) ARCH=x86_64 ;;
  *) fail "未対応のアーキテクチャです: $(uname -m)" ;;
esac

for cmd in curl tar make clang pkg-config; do
  command -v "$cmd" >/dev/null || fail "$cmd が見つかりません(brew install pkg-config / xcode-select --install)"
done
if [[ "$ARCH" == "x86_64" ]]; then
  command -v nasm >/dev/null || fail "nasm が見つかりません(brew install nasm)"
fi

mkdir -p "$DOWNLOAD_DIR" "$SRC_DIR" "$PREFIX" "$OUT_DIR"

# 依存ライブラリは $PREFIX の静的ライブラリだけを使う(Homebrew のものを参照させない)
export PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig"
unset PKG_CONFIG_PATH
export CFLAGS="-I$PREFIX/include"
export LDFLAGS="-L$PREFIX/lib"
STATIC=(--prefix="$PREFIX" --disable-shared --enable-static)

# ------------------------------------------------------------
# ダウンロードと展開
# ------------------------------------------------------------

# fetch <URL> <ファイル名>: 未取得ならダウンロードして $SRC_DIR に展開する
fetch() {
  local url="$1" file="$2"
  if [[ ! -f "$DOWNLOAD_DIR/$file" ]]; then
    log "ダウンロード: $file"
    curl -fL --retry 3 -o "$DOWNLOAD_DIR/$file.part" "$url"
    mv "$DOWNLOAD_DIR/$file.part" "$DOWNLOAD_DIR/$file"
  fi
  tar -xf "$DOWNLOAD_DIR/$file" -C "$SRC_DIR"
}

# built <名前>: ビルド済みなら真(再実行時にスキップするため)
built() { [[ -f "$PREFIX/.built-$1" ]]; }
mark_built() { touch "$PREFIX/.built-$1"; }

# ------------------------------------------------------------
# 依存ライブラリ
# ------------------------------------------------------------

# libvpx (BSD-3-Clause): WebM(VP9)
if ! built "libvpx-$LIBVPX_VERSION"; then
  fetch "https://github.com/webmproject/libvpx/archive/refs/tags/v$LIBVPX_VERSION.tar.gz" "libvpx-$LIBVPX_VERSION.tar.gz"
  log "ビルド: libvpx $LIBVPX_VERSION"
  (
    cd "$SRC_DIR/libvpx-$LIBVPX_VERSION"
    ./configure --prefix="$PREFIX" --disable-shared --enable-static \
      --disable-examples --disable-tools --disable-unit-tests --disable-docs
    make -j"$JOBS"
    make install
  )
  mark_built "libvpx-$LIBVPX_VERSION"
fi

# LAME (LGPL-2.0-or-later): MP3
if ! built "lame-$LAME_VERSION"; then
  fetch "https://downloads.sourceforge.net/lame/lame-$LAME_VERSION.tar.gz" "lame-$LAME_VERSION.tar.gz"
  log "ビルド: LAME $LAME_VERSION"
  (
    cd "$SRC_DIR/lame-$LAME_VERSION"
    # 存在しないシンボルがエクスポート一覧にあり、macOS ではリンクに失敗するため削除する(Homebrew と同じ対処)
    sed -i '' '/lame_init_old/d' include/libmp3lame.sym
    ./configure "${STATIC[@]}" --disable-frontend
    make -j"$JOBS"
    make install
  )
  mark_built "lame-$LAME_VERSION"
fi

# Opus (BSD-3-Clause)
if ! built "opus-$OPUS_VERSION"; then
  fetch "https://downloads.xiph.org/releases/opus/opus-$OPUS_VERSION.tar.gz" "opus-$OPUS_VERSION.tar.gz"
  log "ビルド: Opus $OPUS_VERSION"
  (
    cd "$SRC_DIR/opus-$OPUS_VERSION"
    ./configure "${STATIC[@]}" --disable-doc --disable-extra-programs
    make -j"$JOBS"
    make install
  )
  mark_built "opus-$OPUS_VERSION"
fi

# libogg (BSD-3-Clause): libvorbis が使う
if ! built "libogg-$LIBOGG_VERSION"; then
  fetch "https://downloads.xiph.org/releases/ogg/libogg-$LIBOGG_VERSION.tar.gz" "libogg-$LIBOGG_VERSION.tar.gz"
  log "ビルド: libogg $LIBOGG_VERSION"
  (
    cd "$SRC_DIR/libogg-$LIBOGG_VERSION"
    ./configure "${STATIC[@]}"
    make -j"$JOBS"
    make install
  )
  mark_built "libogg-$LIBOGG_VERSION"
fi

# libvorbis (BSD-3-Clause): Ogg Vorbis
if ! built "libvorbis-$LIBVORBIS_VERSION"; then
  fetch "https://downloads.xiph.org/releases/vorbis/libvorbis-$LIBVORBIS_VERSION.tar.gz" "libvorbis-$LIBVORBIS_VERSION.tar.gz"
  log "ビルド: libvorbis $LIBVORBIS_VERSION"
  (
    cd "$SRC_DIR/libvorbis-$LIBVORBIS_VERSION"
    # 現在の clang が受け付けないオプションを削除する(Homebrew と同じ対処)
    sed -i '' 's/ -force_cpusubtype_ALL//' configure
    ./configure "${STATIC[@]}" --with-ogg="$PREFIX"
    make -j"$JOBS"
    make install
  )
  mark_built "libvorbis-$LIBVORBIS_VERSION"
fi

# libwebp (BSD-3-Clause): WebP
if ! built "libwebp-$LIBWEBP_VERSION"; then
  fetch "https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-$LIBWEBP_VERSION.tar.gz" "libwebp-$LIBWEBP_VERSION.tar.gz"
  log "ビルド: libwebp $LIBWEBP_VERSION"
  (
    cd "$SRC_DIR/libwebp-$LIBWEBP_VERSION"
    ./configure "${STATIC[@]}" --disable-gif --disable-jpeg --disable-png --disable-tiff
    make -j"$JOBS"
    make install
  )
  mark_built "libwebp-$LIBWEBP_VERSION"
fi

# ------------------------------------------------------------
# FFmpeg
# ------------------------------------------------------------

fetch "https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz" "ffmpeg-$FFMPEG_VERSION.tar.xz"
log "ビルド: FFmpeg $FFMPEG_VERSION"
(
  cd "$SRC_DIR/ffmpeg-$FFMPEG_VERSION"
  # --enable-gpl / --enable-version3 / --enable-nonfree を付けないことで LGPL-2.1-or-later になる
  ./configure \
    --prefix="$PREFIX" \
    --extra-cflags="$CFLAGS" \
    --extra-ldflags="$LDFLAGS" \
    --pkg-config-flags="--static" \
    --disable-autodetect \
    --enable-zlib \
    --enable-videotoolbox \
    --enable-libvpx \
    --enable-libmp3lame \
    --enable-libopus \
    --enable-libvorbis \
    --enable-libwebp \
    --disable-ffplay \
    --disable-ffprobe \
    --disable-doc
  make -j"$JOBS"
)
FFMPEG_BIN="$SRC_DIR/ffmpeg-$FFMPEG_VERSION/ffmpeg"

# ------------------------------------------------------------
# 検証
# ------------------------------------------------------------

log "検証"

# pipefail 下で grep -q が途中で読むのをやめると誤判定するため、出力を変数に受けてから調べる
LICENSE_TEXT="$("$FFMPEG_BIN" -hide_banner -L)"
grep -q "Lesser General Public License" <<<"$LICENSE_TEXT" ||
  fail "ライセンスが LGPL になっていません(ffmpeg -L を確認してください)"

BUILDCONF="$("$FFMPEG_BIN" -hide_banner -buildconf)"
if grep -qE -- "--enable-(gpl|version3|nonfree)" <<<"$BUILDCONF"; then
  fail "--enable-gpl / --enable-version3 / --enable-nonfree が含まれています"
fi

ENCODERS="$("$FFMPEG_BIN" -hide_banner -encoders)"
for encoder in h264_videotoolbox libvpx-vp9 mpeg4 libmp3lame aac flac wmav2 libvorbis libopus png mjpeg libwebp gif; do
  grep -qE "^ [A-Z.]{6} $encoder " <<<"$ENCODERS" || fail "エンコーダ $encoder がありません"
done

# システムのライブラリ・フレームワーク以外に動的リンクしていないこと
EXTERNAL_LIBS="$(otool -L "$FFMPEG_BIN" | tail -n +2 | awk '{print $1}' | grep -vE '^(/usr/lib/|/System/)' || true)"
[[ -z "$EXTERNAL_LIBS" ]] || fail "システム以外のライブラリに動的リンクしています:
$EXTERNAL_LIBS"

echo "OK: LGPL / 必要なエンコーダあり / 外部の動的ライブラリなし"

# ------------------------------------------------------------
# 成果物
# ------------------------------------------------------------

log "成果物を出力"

OUT_BIN="$OUT_DIR/ffmpeg-$ARCH-apple-darwin"
cp "$FFMPEG_BIN" "$OUT_BIN"

# 対応するソースコード一式(各ライブラリのソースとこのスクリプト)
SRC_ARCHIVE="$OUT_DIR/ffmpeg-lgpl-$FFMPEG_VERSION-macos-src.tar.gz"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT
mkdir -p "$STAGING/ffmpeg-lgpl-$FFMPEG_VERSION-macos-src"
cp "$DOWNLOAD_DIR"/*.tar.* "$SCRIPT_PATH" "$STAGING/ffmpeg-lgpl-$FFMPEG_VERSION-macos-src/"
(
  cd "$STAGING/ffmpeg-lgpl-$FFMPEG_VERSION-macos-src"
  {
    echo "このディレクトリのソースと build-ffmpeg-lgpl-macos.sh から、同梱している FFmpeg をビルドできます。"
    echo
    shasum -a 256 -- *.tar.*
  } >README.txt
)
tar -czf "$SRC_ARCHIVE" -C "$STAGING" "ffmpeg-lgpl-$FFMPEG_VERSION-macos-src"

cat <<EOF

完了しました。

  バイナリ:         $OUT_BIN
  ソースコード一式: $SRC_ARCHIVE

アプリに組み込むには(GPL 版のバイナリは退避してください):
  cp "$OUT_BIN" src-tauri/binaries/
  npm run tauri:build:lgpl

配布するときは、ソースコード一式をリリースに添付してください。
EOF
