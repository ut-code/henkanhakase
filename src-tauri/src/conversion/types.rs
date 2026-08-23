use serde::Deserialize;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
pub enum FileFormat {
    #[serde(rename = "png")]
    Png,

    #[serde(rename = "jpg", alias = "jpeg")]
    Jpeg,

    #[serde(rename = "webp")]
    Webp,

    #[serde(rename = "gif")]
    Gif,

    #[serde(rename = "mp4")]
    Mp4,

    #[serde(rename = "webm")]
    Webm,

    #[serde(rename = "avi")]
    Avi,

    #[serde(rename = "mov")]
    Mov,

    #[serde(rename = "mp3")]
    Mp3,

    #[serde(rename = "m4a")]
    M4a,

    #[serde(rename = "aac")]
    Aac,

    #[serde(rename = "wav")]
    Wav,

    #[serde(rename = "aiff")]
    Aiff,

    #[serde(rename = "flac")]
    Flac,

    #[serde(rename = "wma")]
    Wma,

    #[serde(rename = "ogg")]
    Ogg,

    #[serde(rename = "opus")]
    Opus,
}

impl FileFormat {
    pub fn extension(self) -> &'static str {
        match self {
            Self::Png => "png",
            Self::Jpeg => "jpg",
            Self::Webp => "webp",
            Self::Gif => "gif",
            Self::Mp4 => "mp4",
            Self::Webm => "webm",
            Self::Avi => "avi",
            Self::Mov => "mov",
            Self::Mp3 => "mp3",
            Self::M4a => "m4a",
            Self::Aac => "aac",
            Self::Wav => "wav",
            Self::Aiff => "aiff",
            Self::Flac => "flac",
            Self::Wma => "wma",
            Self::Ogg => "ogg",
            Self::Opus => "opus",
        }
    }

    pub fn is_video(self) -> bool {
        matches!(self, Self::Mp4 | Self::Webm | Self::Avi | Self::Mov)
    }
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ConversionOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    pub compression_level: Option<u32>,
    pub q_v_jpeg: Option<u32>,
    pub q_v_webp: Option<u32>,
    pub fps: Option<u32>,
    pub max_colors: Option<u32>,
}

impl ConversionOptions {
    pub fn validate(&self) -> Result<(), String> {
        if let Some(width) = self.width {
            if width == 0 {
                return Err("幅は 1 以上で指定してください".into());
            }
        }

        if let Some(height) = self.height {
            if height == 0 {
                return Err("高さは 1 以上で指定してください".into());
            }
        }

        if let Some(compression_level) = self.compression_level {
            if !(0..=9).contains(&compression_level) {
                return Err("compression_levelは 0〜9 の範囲で指定してください".into());
            }
        }

        if let Some(q_v_jpeg) = self.q_v_jpeg {
            if !(0..=31).contains(&q_v_jpeg) {
                return Err("q:v は 0〜31 の範囲で指定してください".into());
            }
        }

        if let Some(q_v_webp) = self.q_v_webp {
            if !(1..=100).contains(&q_v_webp) {
                return Err("q:v は 1〜100 の範囲で指定してください".into());
            }
        }

        if let Some(fps) = self.fps {
            if !(1..=120).contains(&fps) {
                return Err("fps は 1〜120 の範囲で指定してください".into());
            }
        }

        if let Some(max_colors) = self.max_colors {
            if !(2..=256).contains(&max_colors) {
                return Err("max_colors は 2〜256 の範囲で指定してください".into());
            }
        }
        Ok(())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionRequest {
    pub data: Vec<u8>,
    pub input_format: FileFormat,
    pub output_format: FileFormat,

    #[serde(default)]
    pub options: ConversionOptions,
}
