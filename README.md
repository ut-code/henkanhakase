# 変換はかせ

あらゆるファイル操作を一括でできるアプリケーション。

## 使用技術, ドキュメント

- フロントエンド: [React](https://ja.react.dev/learn), [TypeScript](https://typescriptbook.jp/), [TailwindCSS](https://tailwindcss.com/docs/installation/using-vite)
- バックエンド: [Rust](https://doc.rust-jp.rs/book-ja/)
- フレームワーク: [Tauri](https://v2.tauri.app/ja/develop/)
- ツール: [FFmpeg](https://ffmpeg.org/)

## ディレクトリ構成

### 追跡ディレクトリ

| パス                        | 内容                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `public`                    | ビルド後にルートに置かれる。画像など                          |
| `scripts/build-ffmpeg-lgpl-macos.sh` | MacOS向けLGPL版FFmpegのビルドスクリプト                       |
| `src/assets`              | 画像など。importして使える                                            |
| `src/components`            | Reactのコンポーネント                                          |
| `src/utils/browser-ffmpeg-browser.ts` | `@ffmpeg/core` WASMの読み込み、ブラウザ上の調査・変換 |
| `src/utils/browser-ffmpeg-desktop.ts` | デスクトップ版でブラウザ用WASMを誤って呼ばないための代替処理 |
| `src/utils/dimension.ts`    | 画像や動画のサイズの正規化                                       |
| `src/utils/error.ts`        | Tauriから返されたエラーコードを画面表示用の文章へ変換           |
| `src/utils/ffmpeg-command.ts` | サイズ調査・サムネイル作成用のFFmpeg引数とPNGサイズ解析       |
| `src/utils/ffmpeg.ts`       | ブラウザ版FFmpegに渡す変換指示の組み立て                         |
| `src/utils/path.ts`         | ファイルパスから拡張子と入力形式を判定                           |
| `src/App.css`               | スタイルシート                                                |
| `src/formats.ts`             | 変換可能なファイル形式、拡張子、MIME typeの定義                 |
| `src/license-links.ts`        | ライセンスページの生成                          |
| `src/App.tsx`               | フロントエンドの本体                                          |
| `src/i18n.tsx`                | 多言語対応の設定                                              |
| `src-tauri/icons`           | アプリケーションアイコン                                      |
| `src-tauri/licenses`        | 依存ライブラリのライセンス一覧。インストーラーに同梱される    |
| `src-tauri/src/conversion/error.rs` | 変換処理におけるエラーの定義                            |
| `src-tauri/src/conversion/ffmpeg.rs` | FFmpegのコマンドの組み立て                            |
| `src-tauri/src/conversion/mod.rs`    | 変換処理のモジュール                                          |
| `src-tauri/src/conversion/progress.rs`    | 変換処理の進行状況                                |
| `src-tauri/src/conversion/types.rs`  | 変換処理の型定義                                      |
| `src-tauri/src/lib.rs`      | 変換処理の呼び出し                                            |
| `src-tauri/.gitignore`      | Gitで管理しないファイルの設定(バックエンド)                   |
| `src-tauri/about.hbs` | Rustで使用している依存ライブラリのライセンス一覧を表示するためのテンプレート |
| `src-tauri/tauri.conf.json` | Tauriの設定ファイル                                           |
| `src-tauri/tauri.lgpl.conf.json` | TauriのLGPL版の設定ファイル(同梱するバイナリをLGPL版に上書き)                  |
| `src-tauri/build.rs` | Tauriのビルドスクリプト。LGPL版の場合に同梱バイナリがLGPLかどうかを確認する |
| `src-tauri/about.toml`      | Rustのライセンス依存情報                                   |
| `src-tauri/Cargo.toml`      | Rustの設定ファイル                                            |
| `.gitignore`                | Gitで管理しないファイルの設定                                 |
| `package-lock.json`         | npmの依存パッケージのバージョンを固定するためのファイル       |
| `package.json`              | npmの設定ファイル                                             |
| `LICENSE`                   | ライセンス(MIT)                                               |
| `README.md`                 | この文章                                                      |

### ブラウザ版とデスクトップ版の変換処理の対応

`src/utils/` と `src-tauri/src/` は、同じ変換機能を別の実行環境で実装する
ためのコードですが、ファイル構成や処理内容が完全に同じではありません。
ブラウザ版はTypeScriptから`@ffmpeg/core`のWASMを実行し、デスクトップ版は
Rustから同梱したFFmpegの補助実行ファイルを実行します。

| ブラウザ版 (`src/utils`) | デスクトップ版 (`src-tauri/src/conversion`) | 対応する処理 |
| --- | --- | --- |
| `ffmpeg.ts` | `ffmpeg.rs` | 入力形式・出力形式・設定値からFFmpegの実行指示を組み立てる。動画、GIF、音声、サイズ変更などの主要な分岐が対応する |
| `ffmpeg-command.ts` の`buildProbeArgs`、`parsePngDimensions` | `mod.rs` の`probe_dimensions`、`parse_png_dimensions` | 入力から1枚のPNG画像を作り、そのPNGの情報から幅・高さを取得する |
| `ffmpeg-command.ts` の`buildThumbnailArgs` | `mod.rs` の`generate_thumbnail` | 動画やGIFからサムネイル画像を作る |
| `browser-ffmpeg-browser.ts` | `mod.rs` の`convert` | 実際の変換を実行する。ブラウザ版はWASM、デスクトップ版は補助実行ファイルを使う |
| `browser-ffmpeg-browser.ts` の`probeBrowserFile` | `mod.rs` の`probe_dimensions` | 入力ファイルの幅・高さを取得する。ブラウザ版はImage/Video API、デスクトップ版はFFmpegを使う |
| `browser-ffmpeg-desktop.ts` | 対応するRust処理なし | デスクトップ版にGPLの`@ffmpeg/core`を取り込まず、ブラウザ用処理が呼ばれた場合は明示的にエラーにする |
| `error.ts` | `error.rs` | エラーコードを扱う。TypeScript側は画面表示用の文章へ変換し、Rust側はTauriで返せる形にする |

次の処理はデスクトップ版だけに存在し、`src/utils/`には一対一の対応処理がありません。

- `conversion/mod.rs`: 補助実行ファイルの起動、キャンセル、進み具合の通知、一時ファイルの管理
- `conversion/types.rs`: Rust側の入力形式、変換設定、Tauriから受け取るデータの定義と検証
- `conversion/heic.rs`: `heif-oxide`を使ったHEICの変換、サイズ取得、サムネイル作成
- `conversion/progress.rs`: FFmpegの出力を進み具合の割合へ変換
- `path.ts`: 画面側で必要なファイル名・拡張子の判定であり、Rust側のパス管理とは役割が異なる
- `dimension.ts`: 画面から受け取ったサイズを整える処理であり、Rust側の`ConversionOptions::validate`とは目的が異なる

また、`ffmpeg.ts`と`ffmpeg.rs`は完全に同じ実装ではありません。Rust側には、
デスクトップ固有の進み具合通知、複数サイズのICO作成、AVIF/BMPの詳細設定、
LGPL版でH.264の方式を切り替える処理があります。一方、ブラウザ側は
WASMで利用できる方式を前提に実行指示を作ります。

新しい変換形式や設定を追加するときは、両方の実装と、デスクトップGPL版、
デスクトップLGPL版、ブラウザWASM版のすべてを確認してください。

### 非追跡ディレクトリ

| パス                        | 内容                                                          |
| --------------------------- | ------------------------------------------------------------- |
| `dist`                      | ビルド成果物の出力先ディレクトリ。`npm run build`で生成される |
| `dist-web`                   | ブラウザ版のビルド成果物の出力先ディレクトリ。`npm run build:web`で生成される |
| `node_modules`              | npmの依存パッケージ。`npm install`で生成される                |
| `src-tauri/binaries`        | FFmpegのバイナリファイル。sidecarで使用されている             |
| `src-tauri/binaries-lgpl`   | Mac App Store 向けの LGPL 版 FFmpeg のバイナリファイル         |
| `src-tauri/target/release/bundle` | Tauriのビルド成果物の出力先ディレクトリ。`npm run tauri build`で生成される |

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
   3. `ffmpeg-x86_64-unknown-linux-gnu`にリネームする

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

7. Mac App Store向けLGPL版のFFmpegのビルド(MacOSでのみビルド可能)

   ```bash
   brew install pkg-config nasm
   scripts/build-ffmpeg-lgpl-macos.sh
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
  - GPL版の場合
   ```bash
   npm run tauri build
   ```
- LGPL版の場合
   ```bash
   npm run tauri:build:lgpl
   ```

- ブラウザ版をビルド

  ```bash
  npm run build:web
  ```

  ブラウザ版は `dist-web` に出力され、`@ffmpeg/core` の WebAssembly
  ファイルを使用します。通常の `npm run build` および Tauri のビルドは
  `dist` に出力され、ブラウザ版の FFmpeg は含まれません。

  ビルドしたブラウザ版を試すには、以下を実行します。

  ```bash
  npx vite preview --port 3000 --outDir dist-web
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

## ライセンス

本体のソースコードは [MIT License](LICENSE) で公開しています。

ただし、アプリケーションに同梱している [FFmpeg](https://ffmpeg.org/) のバイナリ(`src-tauri/binaries`)は本体とは別のプログラムで、それぞれのビルドのライセンスに従います。

| 配布先                                    | 同梱する FFmpeg                       | ビルド方法                 |
| ----------------------------------------- | ------------------------------------- | -------------------------- |
| GitHub(Windows / Linux / macOS)、Microsoft Store | GPLv3 版(`src-tauri/binaries`)      | `npm run tauri build`      |
| Mac App Store                             | LGPL 版(`src-tauri/binaries-lgpl`) | `npm run tauri:build:lgpl` |

FFmpeg を同梱して配布する場合は、配布したバイナリに対応する FFmpeg のソースコードを GitHub のリリースに添付してください。ライセンスの本文と説明は `src-tauri/licenses/FFmpeg-*.txt` にあり、インストーラーに同梱されます。

### macOS 向け LGPL 版のビルド

H.264 エンコーダの libx264 は GPL のため、LGPL 版では macOS 標準の VideoToolbox(`h264_videotoolbox`)を使います。`npm run tauri:build:lgpl` は Cargo の `lgpl-ffmpeg` feature を有効にしてエンコーダを切り替え、`src-tauri/tauri.lgpl.conf.json` で同梱する FFmpeg を `src-tauri/binaries-lgpl` のものに差し替えます(macOS でのみビルドできます)。GPL 版と LGPL 版は別のディレクトリに置くので、入れ替える必要はありません。

ビルド時に `src-tauri/build.rs` が、同梱する FFmpeg が LGPL 版であること(`ffmpeg -L` と `-buildconf`)と、feature と設定の組み合わせが正しいことを検証し、問題があればビルドを止めます。

- 画質(CRF)は VideoToolbox の `-q:v` に変換して指定します。Intel Mac では `-q:v` が使えないため、エンコーダの既定のビットレートになります
- `-allow_sw 1` を付けているため、ハードウェアエンコーダが使えない環境ではソフトウェアエンコードになります
- 同梱する FFmpeg は `--enable-gpl` を付けずにビルドした LGPL 版を使ってください。Homebrew の `ffmpeg` は GPL 版なので使えません。macOS で次のスクリプトを実行すると、依存ライブラリ(libvpx・LAME・Opus・Vorbis・WebP)ごと静的リンクでビルドされます

  ```bash
  brew install pkg-config nasm
  scripts/build-ffmpeg-lgpl-macos.sh
  ```

  - バイナリは `src-tauri/binaries-lgpl` に、リリースに添付する対応ソースコード一式(`ffmpeg-lgpl-<version>-macos-src.tar.gz`)は `~/ffmpeg-lgpl/out` に出力されます
  - ビルド後に、ライセンスが LGPL であること、必要なエンコーダがそろっていること、Homebrew などのライブラリに動的リンクしていないことを自動で検証します
  - バージョンや設定はスクリプト冒頭のコメントを参照してください

- Mac App Store ではアプリ全体がサンドボックスで動くため、同梱する FFmpeg にも `com.apple.security.app-sandbox` と `com.apple.security.inherit` の entitlements を付けて署名してください

### 依存ライブラリのライセンス一覧

配布物には `src-tauri/licenses` 配下のライセンス一覧を同梱しています。

| ファイル                           | 内容                       | 更新方法                                                    |
| ---------------------------------- | -------------------------- | ----------------------------------------------------------- |
| `THIRD_PARTY_LICENSES_FRONTEND.txt` | フロントエンドのライブラリ | `npm run build` で自動生成(Git 管理外)                    |
| `THIRD_PARTY_LICENSES_RUST.txt`    | Rust のクレート            | `npm run licenses` で生成(リリース前と Rust の依存を変えたとき) |
| `THIRD_PARTY_LICENSES_OTHER.txt`   | Tailwind CSS、アイコンなど | 手動で編集                                                  |

`npm run licenses` には [cargo-about](https://github.com/EmbarkStudios/cargo-about) が必要です。

```bash
cargo install --locked cargo-about --features cli
```

許可していないライセンスの依存を追加すると、生成時にエラーになります。問題ないライセンスであれば `vite.config.ts` または `src-tauri/about.toml` の許可リストに追加してください。
