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
        .map(|config| config.contains("binaries-lgpl/ffmpeg"))
        .unwrap_or(false);

    if !lgpl_feature {
        if uses_lgpl_binaries {
            panic!(
                "binaries-lgpl を同梱するときは `npm run tauri:build:lgpl` でビルドしてください"
            );
        }
        return;
    }

    // tauri CLI を通さない cargo check などでは TAURI_CONFIG がないため、設定の検証は CLI 経由のときだけ行う
    if env::var_os("TAURI_CONFIG").is_some() && !uses_lgpl_binaries {
        panic!("`lgpl-ffmpeg` で GPL 版の FFmpeg を同梱しようとしています。`npm run tauri:build:lgpl` でビルドしてください");
    }

    let target = env::var("TARGET").unwrap();
    let path = Path::new("binaries-lgpl").join(format!("ffmpeg-{target}"));
    println!("cargo:rerun-if-changed={}", path.display());
    if !path.exists() {
        panic!(
            "{} がありません。scripts/build-ffmpeg-lgpl-macos.sh で LGPL 版の FFmpeg をビルドしてください",
            path.display()
        );
    }

    let run = |arg: &str| {
        let output = Command::new(&path)
            .args(["-hide_banner", arg])
            .output()
            .unwrap_or_else(|e| panic!("{} を実行できません: {e}", path.display()));
        String::from_utf8_lossy(&output.stdout).into_owned()
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
