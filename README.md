# 変換はかせ

あらゆるファイル操作を一括でできるアプリケーション。

## 使用技術, ドキュメント

- フロントエンド: [React](https://ja.react.dev/learn), [TypeScript](https://typescriptbook.jp/), [TailwindCSS](https://tailwindcss.com/docs/installation/using-vite)
- バックエンド: [Rust](https://doc.rust-jp.rs/book-ja/)
- フレームワーク: [Tauri](https://v2.tauri.app/ja/develop/)
- ツール: [FFmpeg](https://ffmpeg.org/)

## ディレクトリ構成

| パス                   | 内容                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `dist`                 | ビルド成果物の出力先ディレクトリ。`npm run build`で生成される |
| `node_modules`         | npmの依存パッケージ。`npm install`で生成される                |
| `public`               | ビルド後にルートに置かれる。画像など                          |
| `src/App.css`          | スタイルシート                                                |
| `src/App.tsx`          | フロントエンドの本体                                          |
| `src-tauri/icons`      | アプリケーションアイコン                                      |
| `src-tauri/src/lib.rs` | 変換処理のロジック                                            |
| `.gitignore`           | Gitで管理しないファイルの設定                                 |
| `package-lock.json`    | npmの依存パッケージのバージョンを固定するためのファイル       |
| `package.json`         | npmの設定ファイル                                             |
| `README.md`            | この文章                                                      |

## インストール

### Windowsの場合

1. [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/ja/visual-cpp-build-tools/)をインストール

2. Rustのインストール

   ```bash
   winget install --id Rustlang.Rustup
   ```

3. FFmpegのインストール
   ```bash
   winget install -e --id Gyan.FFmpeg
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

3. FFmpegのインストール
   ```bash
   brew install ffmpeg-full
   ```

## 開発

- 依存パッケージのインストール

  ```bash
  npm install
  ```

- 開発環境でアプリケーションを起動(ctrl + C / ⌃Cで終了)

  ```bash
  npm run tauri dev
  ```

- アプリケーションをビルド

  ```bash
  npm run tauri build
  ```

- FFmpegでファイル形式を変換する例(プロジェクトのルートにinput.jpgを置く)
  ```bash
  ffmpeg -i input.jpg output.png
  ```
