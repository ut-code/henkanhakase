use std::{env, path::Path, process::Command};

fn main() {
    check_ffmpeg_license();
    tauri_build::build()
}

/// `lgpl-ffmpeg` feature と同梱する FFmpeg の組み合わせを検証する。
/// GPL 版を App Store 向けに同梱したり、LGPL 版で libx264 を呼んだりしないようにする
fn check_ffmpeg_license() {
    println!("cargo:rerun-if-env-changed=TAURI_CONFIG");
    let lgpl_feature = env::var_os("CARGO_FEATURE_LGPL_FFMPEG").is_some();
    // tauri CLI の --config で上書きした設定(tauri.lgpl.conf.json)はここに入る
    let uses_lgpl_binaries = env::var("TAURI_CONFIG")
        .map(|config| config.contains("binaries-lgpl/henkanhakase-ffmpeg"))
        .unwrap_or(false);

    if !lgpl_feature {
        if uses_lgpl_binaries {
            panic!(
                "binaries-lgpl を同梱するときは `npm run tauri:build:lgpl` でビルドしてください"
            );
        }
        check_gpl_ffmpeg();
        return;
    }

    // tauri CLI を通さない cargo check などでは TAURI_CONFIG がないため、設定の検証は CLI 経由のときだけ行う
    if env::var_os("TAURI_CONFIG").is_some() && !uses_lgpl_binaries {
        panic!("`lgpl-ffmpeg` で GPL 版の FFmpeg を同梱しようとしています。`npm run tauri:build:lgpl` でビルドしてください");
    }

    let target = env::var("TARGET").unwrap();
    let path = Path::new("binaries-lgpl").join(format!("henkanhakase-ffmpeg-{target}"));
    println!("cargo:rerun-if-changed={}", path.display());
    if !path.exists() {
        panic!(
            "{} がありません。`scripts/build-ffmpeg.sh lgpl` で LGPL 版の FFmpeg をビルドしてください",
            path.display()
        );
    }

    let run = |arg: &str| {
        run_ffmpeg(&path, arg)
            .unwrap_or_else(|e| panic!("{} を実行できません: {e}", path.display()))
    };
    if !run("-L").contains("Lesser General Public License") {
        panic!("{} は LGPL 版ではありません", path.display());
    }
    if ["--enable-gpl", "--enable-version3", "--enable-nonfree"]
        .iter()
        .any(|flag| run("-buildconf").contains(flag))
    {
        panic!(
            "{} に GPL / version3 / nonfree の機能が含まれています",
            path.display()
        );
    }
}

/// GPL 版として同梱する FFmpeg が `scripts/build-ffmpeg.sh gpl` でビルドしたもの
/// (GPL-2.0-or-later。FFmpeg-NOTICE.txt の記載と一致する)かを確かめる。
/// 配布物を作る release ビルドでは止め、開発中の debug ビルドでは警告にとどめる
fn check_gpl_ffmpeg() {
    let target = env::var("TARGET").unwrap();
    let exe = if target.contains("windows") {
        ".exe"
    } else {
        ""
    };
    let path = Path::new("binaries").join(format!("henkanhakase-ffmpeg-{target}{exe}"));
    println!("cargo:rerun-if-changed={}", path.display());
    // 置いていない場合は tauri-build がエラーにする
    if !path.exists() {
        return;
    }

    let release = env::var("PROFILE").as_deref() == Ok("release");
    let report = |message: String| {
        if release {
            panic!("{message}");
        }
        println!("cargo:warning={message}");
    };

    // クロスコンパイルなどで実行できない場合は検証できない
    let buildconf = match run_ffmpeg(&path, "-buildconf") {
        Ok(buildconf) => buildconf,
        Err(e) => {
            println!(
                "cargo:warning={} を実行できないため、ライセンスを検証できませんでした: {e}",
                path.display()
            );
            return;
        }
    };
    if !buildconf.contains("--enable-gpl")
        || ["--enable-version3", "--enable-nonfree"]
            .iter()
            .any(|flag| buildconf.contains(flag))
    {
        report(format!(
            "{} は `scripts/build-ffmpeg.sh gpl` でビルドした FFmpeg ではありません(FFmpeg-NOTICE.txt の記載と一致しません)",
            path.display()
        ));
    }
}

fn run_ffmpeg(path: &Path, arg: &str) -> Result<String, String> {
    let output = Command::new(path)
        .args(["-hide_banner", arg])
        .output()
        .map_err(|e| e.to_string())?;
    // 実行できても異常終了した場合(依存ライブラリが足りないなど)は、出力が空でライセンスを誤判定するため失敗にする
    if !output.status.success() {
        return Err(format!(
            "{}: {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}
