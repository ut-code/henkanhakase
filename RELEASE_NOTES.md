# 変換はかせ

〜ファイル変換、これ一つ〜

変換はかせは、画像・動画・音声の形式を手軽に変換できるアプリです。複数のファイルをまとめて選ぶことや、出力形式や画質などを調整することも可能です。

## ダウンロード

お使いの環境に合わせて、次のファイルを 1 つダウンロードしてください。

### Windows

- `henkanhakase_1.0.0_x64-setup.exe`（おすすめ）
- `henkanhakase_1.0.0_x64_en-US.msi`（企業などで MSI 形式が必要な場合）

### macOS

- Apple Silicon（M1 以降）: `henkanhakase_1.0.0_aarch64.dmg`

### Linux

- Ubuntu / Debian 系: `henkanhakase_1.0.0_amd64.deb`  
  `sudo apt install ./henkanhakase_1.0.0_amd64.deb` でインストールできます。
- Fedora / openSUSE 系: `henkanhakase-1.0.0-1.x86_64.rpm`  
  `sudo dnf install ./henkanhakase-1.0.0-1.x86_64.rpm` でインストールできます。
- その他のディストリビューション: `henkanhakase_1.0.0_amd64.AppImage`

## ライセンス

本アプリケーション本体は MIT License で提供されています。

本アプリケーションには FFmpeg が同梱されています。FFmpeg は本アプリケーション本体とは別のプログラムで、GPL-2.0-or-later の条件が適用されます。

このリリースに含まれる FFmpeg（Windows / macOS / Linux 版すべて）に対応するソースコードは、本リリースに添付している次のファイルです。

- `ffmpeg-gpl-8.1-src.tar.gz`

このアーカイブには、FFmpeg と静的リンクしている各ライブラリのソース、およびビルドスクリプト（`build-ffmpeg.sh`）が含まれています。ライセンスの本文は、アプリのインストール先にある `licenses` フォルダに同梱しています。