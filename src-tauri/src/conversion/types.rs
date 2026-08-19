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
        }
    }

    pub fn is_video(self) -> bool {
        matches!(
            self,
            Self::Mp4 | Self::Webm | Self::Avi | Self::Mov
        )
    }
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ConversionOptions {
    pub fps: Option<u32>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

impl ConversionOptions {
    pub fn validate(&self) -> Result<(), String> {
        if let Some(fps) = self.fps {
            if !(1..=120).contains(&fps) {
                return Err("FPS は 1〜120 の範囲で指定してください".into());
            }
        }

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

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionRequest {
    pub data: Vec<u8>,
    pub stem: String,
    pub input_format: FileFormat,
    pub output_format: FileFormat,

    #[serde(default)]
    pub options: ConversionOptions,
}