# 変換はかせ

あらゆるファイル操作を一括でできるアプリケーション。

## 使用技術, ドキュメント

- フロントエンド: [React](https://ja.react.dev/learn), [TypeScript](https://typescriptbook.jp/), [TailwindCSS](https://tailwindcss.com/docs/installation/using-vite)
- バックエンド: [Rust](https://doc.rust-jp.rs/book-ja/)
- フレームワーク: [Tauri](https://v2.tauri.app/ja/develop/)
- ツール: [FFmpeg](https://ffmpeg.org/)

## ディレクトリ構成

| パス                        | 内容                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `dist`                      | ビルド成果物の出力先ディレクトリ。`npm run build`で生成される |
| `node_modules`              | npmの依存パッケージ。`npm install`で生成される                |
| `public`                    | ビルド後にルートに置かれる。画像など                          |
| `src/App.css`               | スタイルシート                                                |
| `src/App.tsx`               | フロントエンドの本体                                          |
| `src-tauri/binaries`        | FFmpegのバイナリファイル。sidecarで使用されている             |
| `src-tauri/icons`           | アプリケーションアイコン                                      |
| `src-tauri/src/lib.rs`      | 変換処理のロジック                                            |
| `src-tauri/.gitignore`      | Gitで管理しないファイルの設定(バックエンド)                   |
| `src-tauri/tauri.conf.json` | Tauriの設定ファイル                                           |
| `src-tauri/Cargo.toml`      | Rustの設定ファイル                                            |
| `.gitignore`                | Gitで管理しないファイルの設定                                 |
| `package-lock.json`         | npmの依存パッケージのバージョンを固定するためのファイル       |
| `package.json`              | npmの設定ファイル                                             |
| `README.md`                 | この文章                                                      |

## インストール

### Windowsの場合

1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/ja/visual-cpp-build-tools/)をインストール

2. Rustのインストール

   ```bash
   winget install --id Rustlang.Rustup
   ```

### MacOSの場合

1. Rustのインストール

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
   ```

2. Homebrewのインストール

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   echo 'eval $(/opt/homebrew/bin/brew shellenv)' >> ~/.zprofile
   eval $(/opt/homebrew/bin/brew shellenv)
   source ~/.zshrc
   ```

## FFmpegのバイナリファイルの設置

1. `src-tauri/binaries`ディレクトリを作成

2. Linux用のバイナリファイルの用意
   1. https://github.com/BtbN/FFmpeg-Builds/releases から`ffmpeg-n8.1-latest-linux64-gpl-8.1.tar.xz`をダウンロード
   2. 解凍して出てくる`bin/ffmpeg`を`src-tauri/binaries`配下に設置
   3. `fmpeg-x86_64-unknown-linux-gnu`にリネームする

3. Windows用のバイナリファイルの用意
   1. https://www.gyan.dev/ffmpeg/builds/ から`ffmpeg-release-full.7z`をダウンロード
   2. 解凍して出てくる`bin/ffmpeg.exe`を`src-tauri/binaries`配下に設置
   3. `ffmpeg-x86_64-pc-windows-msvc.exe`にリネームする

4. MacOS(Intel)用のバイナリファイルの用意
   1. https://evermeet.cx/ffmpeg/ から`ffmpeg-9.0.1.7z`をダウンロード
   2. 解凍して出てくる`ffmpeg`を`src-tauri/binaries`配下に設置
   3. `ffmpeg-x86_64-apple-darwin`にリネームする

5. MacOS(Apple Silicon)用のバイナリファイルの用意
   1. https://www.osxexperts.net/ で"Download ffmpeg 9.0 (Apple Silicon)"をクリックして`ffmpeg9arm.zip`をダウンロード
   2. 解凍して出てくる`ffmpeg`を`src-tauri/binaries`配下に設置
   3. `ffmpeg-aarch64-apple-darwin`にリネームする

6. バイナリファイルの実行権限を付与(初回のみ)

   ```bash
   chmod +x src-tauri/binaries/ffmpeg-*
   ```

## 開発

- 依存パッケージのインストール(`package.json`が更新されたときに実行)

  ```bash
  npm install
  ```

- 新たなパッケージのインストール

  ```bash
  npm install <パッケージ名>
  ```

- tauriのプラグインのインストール

  ```bash
  npm run tauri add <プラグイン名>
  ```

- 開発環境でアプリケーションを起動(`ctrl + C` / `⌃C`で終了)

  ```bash
  npm run tauri dev
  ```

- アプリケーションをビルド

  ```bash
  npm run tauri build
  ```

- FFmpegのインストール(バイナリファイルを設置するため、インストールしなくてもアプリケーションは動作する)
  - Windowsの場合

  ```bash
  winget install -e --id Gyan.FFmpeg
  ```

  - MacOSの場合

  ```bash
  brew install ffmpeg-full
  ```

- FFmpegでファイル形式を変換する例(プロジェクトのルートに`input.jpg`を置く)
  ```bash
  ffmpeg -i input.jpg output.png
  ```
