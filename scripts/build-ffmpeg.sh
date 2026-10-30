#!/usr/bin/env bash
# アプリに同梱する FFmpeg を、必要なライブラリだけ静的リンクしてビルドする。
# GPL 版と LGPL 版で同じソース・同じバージョンを使い、対応するソースコード一式も出力する。
#
# 使い方:
#   scripts/build-ffmpeg.sh gpl            # GPL 版を実行環境(Linux / macOS)向けにビルド
#   scripts/build-ffmpeg.sh gpl windows    # GPL 版を Windows 向けにビルド(Linux からクロスコンパイル)
#   scripts/build-ffmpeg.sh lgpl           # LGPL 版を Mac App Store 向けにビルド(macOS のみ)
#
# 必要なもの:
#   Linux:          sudo apt install build-essential pkg-config cmake nasm curl
#   Windows 向け:   上記に加えて sudo apt install mingw-w64
#   macOS:          xcode-select --install && brew install pkg-config cmake nasm
#
# 成果物:
#   src-tauri/binaries/henkanhakase-ffmpeg-<target>       … GPL 版。`npm run tauri build` で同梱される
#   src-tauri/binaries-lgpl/henkanhakase-ffmpeg-<target>  … LGPL 版。`npm run tauri:build:lgpl` で同梱される
#   $WORK_DIR/out/ffmpeg-<gpl|lgpl>-<version>-src.tar.gz
#     … 配布時にリリースへ添付する、対応するソースコード一式。
#       ソースは全プラットフォームで共通なので、GPL 版・LGPL 版それぞれ 1 つ添付すればよい
#
# 環境変数で変更できるもの:
#   WORK_DIR                  作業ディレクトリ(既定: ~/ffmpeg-build)
#   MACOSX_DEPLOYMENT_TARGET  macOS 向けに対応する最小の macOS バージョン(既定: 11.0)
#   JOBS                      並列ビルド数(既定: CPU コア数)

set -euo pipefail

# バージョンを変えたときは、全プラットフォームでビルドし直してソースコード一式も添付し直す
FFMPEG_VERSION=8.1
ZLIB_VERSION=1.3.2
LIBVPX_VERSION=1.17.0
LIBAOM_VERSION=3.15.2
LAME_VERSION=3.100
OPUS_VERSION=1.6.1
LIBOGG_VERSION=1.3.5
LIBVORBIS_VERSION=1.3.7
LIBWEBP_VERSION=1.6.0
# x264 はリリースのタグがないため、stable ブランチのコミットを固定する
X264_COMMIT=b35605ace3ddf7c1a5d67a2eb553f034aef41d55

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m警告: %s\033[0m\n' "$*" >&2; }
fail() { printf '\033[1;31mエラー: %s\033[0m\n' "$*" >&2; exit 1; }

usage() {
  cat >&2 <<'EOF'
使い方:
  scripts/build-ffmpeg.sh gpl            # GPL 版を実行環境(Linux / macOS)向けにビルド
  scripts/build-ffmpeg.sh gpl windows    # GPL 版を Windows 向けにビルド(Linux からクロスコンパイル)
  scripts/build-ffmpeg.sh lgpl           # LGPL 版を Mac App Store 向けにビルド(macOS のみ)
EOF
  exit 1
}

SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
REPO_DIR="$(dirname "$(dirname "$SCRIPT_PATH")")"

LICENSE="${1:-}"
PLATFORM="${2:-native}"
[[ "$LICENSE" == "gpl" || "$LICENSE" == "lgpl" ]] || usage

# ------------------------------------------------------------
# ビルド対象
# ------------------------------------------------------------

HOST_OS="$(uname -s)"
case "$PLATFORM" in
  native)
    case "$HOST_OS" in
      Linux) OS=linux ;;
      Darwin) OS=macos ;;
      *) fail "未対応の OS です: $HOST_OS" ;;
    esac
    case "$(uname -m)" in
      arm64 | aarch64) ARCH=aarch64 ;;
      x86_64) ARCH=x86_64 ;;
      *) fail "未対応のアーキテクチャです: $(uname -m)" ;;
    esac
    ;;
  windows)
    [[ "$HOST_OS" == "Linux" ]] || fail "Windows 向けのビルドは Linux(WSL など)で実行してください"
    OS=windows
    ARCH=x86_64
    ;;
  *) usage ;;
esac

# Tauri の sidecar は Rust のターゲット名を付けたファイル名で探す。
# Linux の .deb では /usr/bin に置かれるため、ディストリビューションの ffmpeg とぶつからない名前にする
case "$OS" in
  linux) TARGET="$ARCH-unknown-linux-gnu" EXE="" ;;
  macos) TARGET="$ARCH-apple-darwin" EXE="" ;;
  windows) TARGET="$ARCH-pc-windows-msvc" EXE=".exe" ;;
esac

# lgpl-ffmpeg feature は H.264 に VideoToolbox を使うため、LGPL 版は macOS 向けのみ
if [[ "$LICENSE" == "lgpl" && "$OS" != "macos" ]]; then
  fail "LGPL 版は macOS 向けのみビルドできます(H.264 に VideoToolbox を使うため)"
fi

if [[ "$LICENSE" == "gpl" ]]; then
  BIN_DIR="$REPO_DIR/src-tauri/binaries"
else
  BIN_DIR="$REPO_DIR/src-tauri/binaries-lgpl"
fi

WORK_DIR="${WORK_DIR:-$HOME/ffmpeg-build}"
DOWNLOAD_DIR="$WORK_DIR/downloads"
BUILD_DIR="$WORK_DIR/$LICENSE-$TARGET"
SRC_DIR="$BUILD_DIR/src"
PREFIX="$BUILD_DIR/prefix"
OUT_DIR="$WORK_DIR/out"

# ------------------------------------------------------------
# 事前チェック
# ------------------------------------------------------------

if [[ "$OS" == "macos" ]]; then
  JOBS="${JOBS:-$(sysctl -n hw.ncpu)}"
  export MACOSX_DEPLOYMENT_TARGET="${MACOSX_DEPLOYMENT_TARGET:-11.0}"
else
  JOBS="${JOBS:-$(nproc)}"
fi

REQUIRED=(curl tar make cmake pkg-config)
case "$OS" in
  # GNU tar は .tar.xz の展開に xz コマンドを使う(macOS の tar は不要)
  linux) REQUIRED+=(xz cc readelf) ;;
  macos) REQUIRED+=(cc otool) ;;
  windows)
    CROSS=x86_64-w64-mingw32
    REQUIRED+=(xz "$CROSS-gcc" "$CROSS-ar" "$CROSS-objdump")
    ;;
esac
[[ "$ARCH" == "x86_64" ]] && REQUIRED+=(nasm)
for cmd in "${REQUIRED[@]}"; do
  command -v "$cmd" >/dev/null || fail "$cmd が見つかりません(スクリプト冒頭の「必要なもの」を参照してください)"
done

mkdir -p "$DOWNLOAD_DIR" "$SRC_DIR" "$PREFIX" "$OUT_DIR"

# 依存ライブラリは $PREFIX の静的ライブラリだけを使う(システムや Homebrew のものを参照させない)
export PKG_CONFIG_LIBDIR="$PREFIX/lib/pkgconfig"
unset PKG_CONFIG_PATH
# CFLAGS を設定すると autoconf や zlib の既定の最適化(-O2 / -O3)が外れるため、インクルードパスは CPPFLAGS で渡す
unset CFLAGS CXXFLAGS
export CPPFLAGS="-I$PREFIX/include"
export LDFLAGS="-L$PREFIX/lib"

# autotools のライブラリに共通で渡すオプション
CONFIGURE_ARGS=(--prefix="$PREFIX" --disable-shared --enable-static)
[[ "$OS" == "windows" ]] && CONFIGURE_ARGS+=(--host="$CROSS")
# PIE が既定の Linux では、静的ライブラリも位置独立コードにする
[[ "$OS" == "linux" ]] && CONFIGURE_ARGS+=(--with-pic)

# ------------------------------------------------------------
# ソースコード
# ------------------------------------------------------------

# URL ファイル名 SHA-256(ファイル名は展開後のディレクトリ名 + 拡張子)
# バージョンを変えたときは SHA-256 も更新する(配布元が公開している値と照合すること)
SOURCES=(
  "https://github.com/madler/zlib/releases/download/v$ZLIB_VERSION/zlib-$ZLIB_VERSION.tar.gz zlib-$ZLIB_VERSION.tar.gz bb329a0a2cd0274d05519d61c667c062e06990d72e125ee2dfa8de64f0119d16"
  "https://github.com/webmproject/libvpx/archive/refs/tags/v$LIBVPX_VERSION.tar.gz libvpx-$LIBVPX_VERSION.tar.gz 1020f184046187baa2985dbde38e0691f49c44088bca7a1842b0236c6081dc0a"
  "https://storage.googleapis.com/aom-releases/libaom-$LIBAOM_VERSION.tar.gz libaom-$LIBAOM_VERSION.tar.gz 67bb54b245f33ed98600e08269e6139986e48114e14042474ddd8885801dfddc"
  "https://downloads.sourceforge.net/lame/lame-$LAME_VERSION.tar.gz lame-$LAME_VERSION.tar.gz ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e"
  "https://downloads.xiph.org/releases/opus/opus-$OPUS_VERSION.tar.gz opus-$OPUS_VERSION.tar.gz 6ffcb593207be92584df15b32466ed64bbec99109f007c82205f0194572411a1"
  "https://downloads.xiph.org/releases/ogg/libogg-$LIBOGG_VERSION.tar.gz libogg-$LIBOGG_VERSION.tar.gz 0eb4b4b9420a0f51db142ba3f9c64b333f826532dc0f48c6410ae51f4799b664"
  "https://downloads.xiph.org/releases/vorbis/libvorbis-$LIBVORBIS_VERSION.tar.gz libvorbis-$LIBVORBIS_VERSION.tar.gz 0e982409a9c3fc82ee06e08205b1355e5c6aa4c36bca58146ef399621b0ce5ab"
  "https://storage.googleapis.com/downloads.webmproject.org/releases/webp/libwebp-$LIBWEBP_VERSION.tar.gz libwebp-$LIBWEBP_VERSION.tar.gz e4ab7009bf0629fd11982d4c2aa83964cf244cffba7347ecd39019a9e38c4564"
  "https://ffmpeg.org/releases/ffmpeg-$FFMPEG_VERSION.tar.xz ffmpeg-$FFMPEG_VERSION.tar.xz b072aed6871998cce9b36e7774033105ca29e33632be5b6347f3206898e0756a"
)
if [[ "$LICENSE" == "gpl" ]]; then
  SOURCES+=("https://code.videolan.org/videolan/x264/-/archive/$X264_COMMIT/x264-$X264_COMMIT.tar.bz2 x264-$X264_COMMIT.tar.bz2 6eeb82934e69fd51e043bd8c5b0d152839638d1ce7aa4eea65a3fedcf83ff224")
fi

sha256_of() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# ソースコード一式に含めるファイル
SOURCE_FILES=()
for entry in "${SOURCES[@]}"; do
  read -r url file sha256 <<<"$entry"
  SOURCE_FILES+=("$file")
  if [[ ! -f "$DOWNLOAD_DIR/$file" ]]; then
    log "ダウンロード: $file"
    curl --fail --location --retry 5 --retry-all-errors --retry-delay 2 --connect-timeout 30 --max-time 300 -o "$DOWNLOAD_DIR/$file.part" "$url"
    mv "$DOWNLOAD_DIR/$file.part" "$DOWNLOAD_DIR/$file"
  fi
  # 改ざんされたソースを同梱するバイナリや配布するソースに混ぜないよう、取得済みのものも毎回確かめる
  actual="$(sha256_of "$DOWNLOAD_DIR/$file")"
  [[ "$actual" == "$sha256" ]] || fail "$file の SHA-256 が一致しません(期待値: $sha256、実際: $actual)。
ダウンロードし直す場合は $DOWNLOAD_DIR/$file を削除してください"
done

# unpack <ファイル名>: $SRC_DIR に展開し直してディレクトリに移動する
unpack() {
  local file="$1" dir="${1%.tar.*}"
  rm -rf "${SRC_DIR:?}/$dir"
  tar -xf "$DOWNLOAD_DIR/$file" -C "$SRC_DIR"
  cd "$SRC_DIR/$dir"
}

# built <名前>: ビルド済みなら真(再実行時にスキップするため)。
# 判定はライブラリの名前とバージョンだけなので、ビルドの設定やスクリプトを変えたときは $BUILD_DIR を削除してから実行する
built() { [[ -f "$PREFIX/.built-$1" ]]; }
mark_built() { touch "$PREFIX/.built-$1"; }

# build <名前> <ファイル名> <ビルド関数>
build() {
  local name="$1" file="$2" fn="$3"
  built "$name" && return
  log "ビルド: $name"
  (
    unpack "$file"
    "$fn"
  )
  mark_built "$name"
}

# ------------------------------------------------------------
# 依存ライブラリ
# ------------------------------------------------------------

# zlib (Zlib): PNG など。macOS はシステムのものを使う
build_zlib() {
  if [[ "$OS" == "windows" ]]; then
    make -f win32/Makefile.gcc PREFIX="$CROSS-" -j"$JOBS" libz.a
    make -f win32/Makefile.gcc PREFIX="$CROSS-" \
      BINARY_PATH="$PREFIX/bin" INCLUDE_PATH="$PREFIX/include" LIBRARY_PATH="$PREFIX/lib" install
  else
    CFLAGS="-O3 -fPIC" ./configure --prefix="$PREFIX" --static
    make -j"$JOBS"
    make install
  fi
}

# libvpx (BSD-3-Clause): WebM(VP9)
build_libvpx() {
  local args=(--prefix="$PREFIX" --disable-shared --enable-static
    --disable-examples --disable-tools --disable-unit-tests --disable-docs)
  [[ "$OS" == "windows" ]] && args+=(--target=x86_64-win64-gcc)
  [[ "$OS" == "linux" ]] && args+=(--enable-pic)
  if [[ "$OS" == "windows" ]]; then
    CROSS="$CROSS-" ./configure "${args[@]}"
  else
    ./configure "${args[@]}"
  fi
  make -j"$JOBS"
  make install
}

# libaom (BSD-2-Clause): AVIF(AV1)のエンコードとデコード
build_libaom() {
  local args=(-DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$PREFIX" -DCMAKE_INSTALL_LIBDIR=lib
    -DBUILD_SHARED_LIBS=OFF -DENABLE_DOCS=OFF -DENABLE_EXAMPLES=OFF -DENABLE_TESTS=OFF -DENABLE_TOOLS=OFF)
  [[ "$ARCH" == "x86_64" ]] && args+=(-DENABLE_NASM=ON)
  [[ "$OS" == "linux" ]] && args+=(-DCMAKE_POSITION_INDEPENDENT_CODE=ON)
  [[ "$OS" == "windows" ]] && args+=(-DCMAKE_TOOLCHAIN_FILE="$PWD/cmake/toolchains/x86_64-mingw-gcc.cmake")
  cmake -S . -B _build "${args[@]}"
  cmake --build _build -j"$JOBS"
  cmake --install _build
}

# x264 (GPL-2.0-or-later): H.264。GPL 版のみ
build_x264() {
  local args=(--prefix="$PREFIX" --enable-static --disable-cli --disable-opencl)
  [[ "$OS" == "windows" ]] && args+=(--host="$CROSS" --cross-prefix="$CROSS-")
  [[ "$OS" == "linux" ]] && args+=(--enable-pic)
  ./configure "${args[@]}"
  make -j"$JOBS"
  make install
}

# LAME (LGPL-2.0-or-later): MP3
build_lame() {
  # 存在しないシンボルがエクスポート一覧にあり、リンクに失敗するため削除する(Homebrew と同じ対処)
  sed -i.orig '/lame_init_old/d' include/libmp3lame.sym
  # configure が新しい gcc を判定できず最適化オプションを付けないため、明示する
  CFLAGS="-O2" ./configure "${CONFIGURE_ARGS[@]}" --disable-frontend
  make -j"$JOBS"
  make install
}

# Opus (BSD-3-Clause)
build_opus() {
  local args=("${CONFIGURE_ARGS[@]}" --disable-doc --disable-extra-programs)
  # MinGW では _FORTIFY_SOURCE が libssp を必要とし、静的リンクに失敗するため無効にする
  [[ "$OS" == "windows" ]] && args+=(--disable-stack-protector)
  ./configure "${args[@]}"
  make -j"$JOBS"
  make install
}

# libogg (BSD-3-Clause): libvorbis が使う
build_libogg() {
  ./configure "${CONFIGURE_ARGS[@]}"
  make -j"$JOBS"
  make install
}

# libvorbis (BSD-3-Clause): Ogg Vorbis
build_libvorbis() {
  # 現在の clang が受け付けないオプションを削除する(Homebrew と同じ対処)
  sed -i.orig 's/ -force_cpusubtype_ALL//' configure
  ./configure "${CONFIGURE_ARGS[@]}" --with-ogg="$PREFIX"
  make -j"$JOBS"
  make install
}

# libwebp (BSD-3-Clause): WebP
build_libwebp() {
  ./configure "${CONFIGURE_ARGS[@]}" --disable-gif --disable-jpeg --disable-png --disable-tiff
  make -j"$JOBS"
  make install
}

[[ "$OS" != "macos" ]] && build "zlib-$ZLIB_VERSION" "zlib-$ZLIB_VERSION.tar.gz" build_zlib
build "libvpx-$LIBVPX_VERSION" "libvpx-$LIBVPX_VERSION.tar.gz" build_libvpx
build "libaom-$LIBAOM_VERSION" "libaom-$LIBAOM_VERSION.tar.gz" build_libaom
[[ "$LICENSE" == "gpl" ]] && build "x264-$X264_COMMIT" "x264-$X264_COMMIT.tar.bz2" build_x264
build "lame-$LAME_VERSION" "lame-$LAME_VERSION.tar.gz" build_lame
build "opus-$OPUS_VERSION" "opus-$OPUS_VERSION.tar.gz" build_opus
build "libogg-$LIBOGG_VERSION" "libogg-$LIBOGG_VERSION.tar.gz" build_libogg
build "libvorbis-$LIBVORBIS_VERSION" "libvorbis-$LIBVORBIS_VERSION.tar.gz" build_libvorbis
build "libwebp-$LIBWEBP_VERSION" "libwebp-$LIBWEBP_VERSION.tar.gz" build_libwebp

# ------------------------------------------------------------
# FFmpeg
# ------------------------------------------------------------

# --disable-autodetect はスレッドも無効にするため、スレッドの実装を明示する
FFMPEG_ARGS=(
  --prefix="$PREFIX"
  --extra-cflags="$CPPFLAGS"
  --pkg-config=pkg-config
  --pkg-config-flags="--static"
  --disable-autodetect
  --enable-zlib
  --enable-libvpx
  --enable-libaom
  --enable-libmp3lame
  --enable-libopus
  --enable-libvorbis
  --enable-libwebp
  --disable-ffplay
  --disable-ffprobe
  --disable-doc
)
FFMPEG_LDFLAGS="$LDFLAGS"
case "$OS" in
  linux) FFMPEG_ARGS+=(--enable-pthreads --enable-pic) ;;
  macos) FFMPEG_ARGS+=(--enable-pthreads) ;;
  windows)
    FFMPEG_ARGS+=(--enable-w32threads --target-os=mingw32 --arch=x86_64 --cross-prefix="$CROSS-")
    # MinGW のランタイム(libgcc・winpthread)も静的リンクして、DLL なしで動くようにする
    FFMPEG_LDFLAGS="$LDFLAGS -static"
    ;;
esac
if [[ "$LICENSE" == "gpl" ]]; then
  # --enable-version3 / --enable-nonfree は付けない(GPL-2.0-or-later になる)
  FFMPEG_ARGS+=(--enable-gpl --enable-libx264)
else
  # --enable-gpl / --enable-version3 / --enable-nonfree を付けないことで LGPL-2.1-or-later になる
  FFMPEG_ARGS+=(--enable-videotoolbox)
fi
FFMPEG_ARGS+=(--extra-ldflags="$FFMPEG_LDFLAGS")

log "ビルド: FFmpeg $FFMPEG_VERSION ($LICENSE, $TARGET)"
(
  unpack "ffmpeg-$FFMPEG_VERSION.tar.xz"
  ./configure "${FFMPEG_ARGS[@]}"
  make -j"$JOBS"
)
FFMPEG_BIN="$SRC_DIR/ffmpeg-$FFMPEG_VERSION/ffmpeg$EXE"

# ------------------------------------------------------------
# 検証
# ------------------------------------------------------------

log "検証"

# システム以外のライブラリに動的リンクしていないこと
case "$OS" in
  linux)
    EXTERNAL_LIBS="$(readelf -d "$FFMPEG_BIN" | sed -n 's/.*(NEEDED).*\[\(.*\)\]/\1/p' |
      grep -vE '^(libc|libm|libmvec|libpthread|libdl|librt)\.so|^ld-linux' || true)"
    ;;
  macos)
    EXTERNAL_LIBS="$(otool -L "$FFMPEG_BIN" | tail -n +2 | awk '{print $1}' | grep -vE '^(/usr/lib/|/System/)' || true)"
    ;;
  windows)
    # MinGW のランタイムや依存ライブラリの DLL は lib*.dll / zlib1.dll という名前になる
    EXTERNAL_LIBS="$("$CROSS-objdump" -p "$FFMPEG_BIN" | sed -n 's/.*DLL Name: //p' | grep -iE '^(lib|zlib)' || true)"
    ;;
esac
[[ -z "$EXTERNAL_LIBS" ]] || fail "システム以外のライブラリに動的リンクしています:
$EXTERNAL_LIBS"

# 実行できる環境(Windows 向けは WSL の場合)では、ライセンスとエンコーダも確かめる
if "$FFMPEG_BIN" -hide_banner -version >/dev/null 2>&1; then
  # pipefail 下で grep -q が途中で読むのをやめると誤判定するため、出力を変数に受けてから調べる
  LICENSE_TEXT="$("$FFMPEG_BIN" -hide_banner -L)"
  BUILDCONF="$("$FFMPEG_BIN" -hide_banner -buildconf)"
  if [[ "$LICENSE" == "gpl" ]]; then
    grep -q "GNU General Public License as published by" <<<"$LICENSE_TEXT" &&
      grep -q "either version 2 of the License" <<<"$LICENSE_TEXT" ||
      fail "ライセンスが GPL-2.0-or-later になっていません(ffmpeg -L を確認してください)"
    if grep -qE -- "--enable-(version3|nonfree)" <<<"$BUILDCONF"; then
      fail "--enable-version3 / --enable-nonfree が含まれています"
    fi
  else
    grep -q "Lesser General Public License" <<<"$LICENSE_TEXT" ||
      fail "ライセンスが LGPL になっていません(ffmpeg -L を確認してください)"
    if grep -qE -- "--enable-(gpl|version3|nonfree)" <<<"$BUILDCONF"; then
      fail "--enable-gpl / --enable-version3 / --enable-nonfree が含まれています"
    fi
  fi

  # src-tauri/src/conversion/ffmpeg.rs で使うエンコーダ
  ENCODER_LIST=(libvpx-vp9 libaom-av1 mpeg4 libmp3lame aac flac wmav2 libvorbis libopus
    pcm_s16le pcm_s24le pcm_s32le pcm_s16be pcm_s24be pcm_s32be png mjpeg libwebp gif bmp)
  if [[ "$LICENSE" == "gpl" ]]; then
    ENCODER_LIST+=(libx264)
  else
    ENCODER_LIST+=(h264_videotoolbox)
  fi
  ENCODERS="$("$FFMPEG_BIN" -hide_banner -encoders)"
  for encoder in "${ENCODER_LIST[@]}"; do
    grep -qE "^ [A-Z.]{6} $encoder " <<<"$ENCODERS" || fail "エンコーダ $encoder がありません"
  done
  # AVIF の入力は libaom でデコードする(FFmpeg 内蔵の av1 デコーダはハードウェア必須のため)
  grep -qE "^ [A-Z.]{6} libaom-av1 " <<<"$("$FFMPEG_BIN" -hide_banner -decoders)" ||
    fail "デコーダ libaom-av1 がありません"

  echo "OK: $LICENSE / 必要なエンコーダあり / 外部の動的ライブラリなし"
else
  warn "この環境では $FFMPEG_BIN を実行できないため、ライセンスとエンコーダの検証をスキップしました"
  echo "OK: 外部の動的ライブラリなし"
fi

# ------------------------------------------------------------
# 成果物
# ------------------------------------------------------------

log "成果物を出力"

mkdir -p "$BIN_DIR"
OUT_BIN="$BIN_DIR/henkanhakase-ffmpeg-$TARGET$EXE"
cp "$FFMPEG_BIN" "$OUT_BIN"

# 静的リンクしたライブラリのライセンス表記。BSD 系のライセンスはバイナリの配布時にも本文の同梱が必要。
# GPL 版・LGPL 版のどちらで実行しても同じ内容になるようにする(x264 は本文が GPLv2 のため固定の文面)
NOTICE_FILE="$REPO_DIR/src-tauri/licenses/FFmpeg-LIBRARIES.txt"
# notice <名前> <URL> <ライセンス> <ファイル名> <ライセンスのファイル...>
notice() {
  local name="$1" url="$2" license="$3" file="$4" dir="${4%.tar.*}"
  shift 4
  echo "--------------------------------------------------------------------------------"
  echo "$name ($license)"
  echo "$url"
  echo
  for path in "$@"; do
    tar -xOf "$DOWNLOAD_DIR/$file" "$dir/$path"
    echo
  done
}
{
  echo "THIRD-PARTY SOFTWARE NOTICES (FFmpeg)"
  echo "====================================="
  echo
  echo "同梱している FFmpeg には、以下のライブラリが静的リンクされています。"
  echo "The bundled FFmpeg statically links the following libraries."
  echo
  echo "このファイルは scripts/build-ffmpeg.sh が生成します。"
  echo "Windows 版に静的リンクしている MinGW-w64 のランタイムについては、Windows 版に同梱の FFmpeg-MinGW-w64.txt を参照してください。"
  echo "For the MinGW-w64 runtime linked into the Windows build, see FFmpeg-MinGW-w64.txt (Windows build only)."
  echo
  echo "--------------------------------------------------------------------------------"
  echo "x264 (GPL-2.0-or-later)"
  echo "https://www.videolan.org/developers/x264.html"
  echo
  echo "GPL 版のみに含まれます。ライセンスの本文は FFmpeg-COPYING.GPLv2.txt を参照してください。"
  echo "Included only in the GPL build. See FFmpeg-COPYING.GPLv2.txt for the license text."
  echo
  notice "libvpx $LIBVPX_VERSION" https://chromium.googlesource.com/webm/libvpx BSD-3-Clause \
    "libvpx-$LIBVPX_VERSION.tar.gz" LICENSE PATENTS
  notice "libaom $LIBAOM_VERSION" https://aomedia.googlesource.com/aom BSD-2-Clause \
    "libaom-$LIBAOM_VERSION.tar.gz" LICENSE PATENTS
  notice "LAME $LAME_VERSION" https://lame.sourceforge.io LGPL-2.0-or-later \
    "lame-$LAME_VERSION.tar.gz" COPYING
  notice "Opus $OPUS_VERSION" https://opus-codec.org BSD-3-Clause \
    "opus-$OPUS_VERSION.tar.gz" COPYING
  notice "libogg $LIBOGG_VERSION" https://xiph.org/ogg/ BSD-3-Clause \
    "libogg-$LIBOGG_VERSION.tar.gz" COPYING
  notice "libvorbis $LIBVORBIS_VERSION" https://xiph.org/vorbis/ BSD-3-Clause \
    "libvorbis-$LIBVORBIS_VERSION.tar.gz" COPYING
  notice "libwebp $LIBWEBP_VERSION" https://chromium.googlesource.com/webm/libwebp BSD-3-Clause \
    "libwebp-$LIBWEBP_VERSION.tar.gz" COPYING PATENTS
  notice "zlib $ZLIB_VERSION (macOS 版はシステムの zlib を使用 / system zlib on macOS)" https://zlib.net Zlib \
    "zlib-$ZLIB_VERSION.tar.gz" LICENSE
} >"$NOTICE_FILE"

# 対応するソースコード一式(各ライブラリのソースとこのスクリプト)。全プラットフォームで共通
SRC_NAME="ffmpeg-$LICENSE-$FFMPEG_VERSION-src"
SRC_ARCHIVE="$OUT_DIR/$SRC_NAME.tar.gz"
STAGING="$(mktemp -d)"
trap 'rm -rf "$STAGING"' EXIT
mkdir -p "$STAGING/$SRC_NAME"
for file in "${SOURCE_FILES[@]}"; do
  cp "$DOWNLOAD_DIR/$file" "$STAGING/$SRC_NAME/"
done
cp "$SCRIPT_PATH" "$STAGING/$SRC_NAME/"
(
  cd "$STAGING/$SRC_NAME"
  {
    echo "このディレクトリのソースと build-ffmpeg.sh から、同梱している FFmpeg をビルドできます。"
    echo "ダウンロード済みのソースを使うには、WORK_DIR/downloads にこのディレクトリのアーカイブを置いてから"
    if [[ "$LICENSE" == "gpl" ]]; then
      echo "build-ffmpeg.sh gpl を実行してください(Windows 向けは build-ffmpeg.sh gpl windows)。"
    else
      echo "macOS で build-ffmpeg.sh lgpl を実行してください。"
    fi
    echo
    for file in "${SOURCE_FILES[@]}"; do
      echo "$(sha256_of "$file")  $file"
    done
  } >README.txt
)
tar -czf "$SRC_ARCHIVE" -C "$STAGING" "$SRC_NAME"

if [[ "$LICENSE" == "gpl" ]]; then
  NEXT="npm run tauri build"
else
  NEXT="npm run tauri:build:lgpl"
fi

cat <<EOF

完了しました。

  バイナリ:         $OUT_BIN
  ソースコード一式: $SRC_ARCHIVE

アプリのビルド:
  $NEXT

配布するときは、ソースコード一式をリリースに添付してください。
EOF
