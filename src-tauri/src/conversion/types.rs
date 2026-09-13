use serde::{Deserialize, Serialize};

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
    pub fn is_audio(self) -> bool {
        matches!(
            self,
            Self::Mp3
                | Self::M4a
                | Self::Aac
                | Self::Wav
                | Self::Aiff
                | Self::Flac
                | Self::Wma
                | Self::Ogg
                | Self::Opus
        )
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Default)]
#[serde(rename_all = "lowercase")]
pub enum AudioBitrate {
    #[serde(rename = "64k")]
    K64,

    #[serde(rename = "96k")]
    K96,

    #[default]
    #[serde(rename = "128k")]
    K128,

    #[serde(rename = "160k")]
    K160,

    #[serde(rename = "192k")]
    K192,

    #[serde(rename = "256k")]
    K256,

    #[serde(rename = "320k")]
    K320,
}

impl AudioBitrate {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::K64 => "64k",
            Self::K96 => "96k",
            Self::K128 => "128k",
            Self::K160 => "160k",
            Self::K192 => "192k",
            Self::K256 => "256k",
            Self::K320 => "320k",
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioOptions {
    /// MP3 / M4A / AAC / WMA / OPUS のビットレート
    #[serde(default)]
    pub bitrate: AudioBitrate,

    /// FLAC の圧縮レベル
    pub flac_compression_level: Option<u32>,

    /// OGG/Vorbis の品質
    pub vorbis_quality: Option<i32>,

    /// サンプルレート (None または 0 で自動/元ファイル維持)
    pub sample_rate: Option<u32>,

    /// チャンネル数 (None または 0 で自動/元ファイル維持)
    pub channels: Option<u32>,

    /// WAV / AIFF のPCMビット深度
    pub pcm_bit_depth: Option<u32>,
}

impl Default for AudioOptions {
    fn default() -> Self {
        Self {
            bitrate: AudioBitrate::default(),
            flac_compression_level: Some(5),
            vorbis_quality: Some(4),
            sample_rate: None,
            channels: None,
            pcm_bit_depth: Some(16),
        }
    }
}

impl AudioOptions {
    pub fn validate(&self, output_format: FileFormat) -> Result<(), String> {
        if !output_format.is_audio() {
            return Ok(());
        }

        if let Some(sample_rate) = self.sample_rate {
            // 0 の場合は「自動 (元ファイルを保持)」として扱うため許可
            if sample_rate != 0
                && !matches!(
                    sample_rate,
                    8000 | 11025
                        | 16000
                        | 22050
                        | 32000
                        | 44100
                        | 48000
                        | 88200
                        | 96000
                        | 176400
                        | 192000
                )
            {
                return Err("sampleRate は対応しているサンプルレートを指定してください".into());
            }
        }

        if let Some(channels) = self.channels {
            // 0 の場合は「自動 (元ファイルを保持)」として扱うため許可
            if channels != 0 && !(1..=2).contains(&channels) {
                return Err("channels は 1〜2 の範囲で指定してください".into());
            }
        }

        if let Some(bit_depth) = self.pcm_bit_depth {
            if !matches!(bit_depth, 16 | 24 | 32) {
                return Err("pcmBitDepth は 16 / 24 / 32 のいずれかを指定してください".into());
            }
        }

        if let Some(level) = self.flac_compression_level {
            if level > 12 {
                return Err("flacCompressionLevel は 0〜12 の範囲で指定してください".into());
            }
        }

        if let Some(quality) = self.vorbis_quality {
            if !(-1..=10).contains(&quality) {
                return Err("vorbisQuality は -1〜10 の範囲で指定してください".into());
            }
        }

        Ok(())
    }
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ConversionOptions {
    pub width: Option<u32>,
    pub height: Option<u32>,
    /// リサイズ時に Lanczos 補間を使うか。未指定時は従来どおり有効。
    pub anti_aliasing: Option<bool>,
    pub compression_level: Option<u32>,
    #[serde(rename = "qVJpeg")]
    pub q_v_jpeg: Option<u32>,
    #[serde(rename = "qVWebp")]
    pub q_v_webp: Option<u32>,
    pub fps: Option<u32>,
    pub max_colors: Option<u32>,
    pub crf: Option<u32>,
    pub crf_vp9: Option<u32>,
    pub q_v_avi: Option<u32>,

    /// 音声変換用オプション
    pub audio: Option<AudioOptions>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaProbeRequest {
    pub data: Vec<u8>,
    pub input_format: FileFormat,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaDimensions {
    pub width: u32,
    pub height: u32,
}

impl ConversionOptions {
    pub fn validate(&self, output_format: FileFormat) -> Result<(), String> {
        if let Some(width) = self.width {
            if !(1..=16384).contains(&width) {
                return Err("幅は 1〜16384 の範囲で指定してください".into());
            }
        }

        if let Some(height) = self.height {
            if !(1..=16384).contains(&height) {
                return Err("高さは 1〜16384 の範囲で指定してください".into());
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

        if let Some(crf) = self.crf {
            if !(0..=51).contains(&crf) {
                return Err("crf は 0〜51 の範囲で指定してください".into());
            }
        }

        if let Some(crf_vp9) = self.crf_vp9 {
            if !(0..=63).contains(&crf_vp9) {
                return Err("crf は 0〜63 の範囲で指定してください".into());
            }
        }

        if let Some(q_v_avi) = self.q_v_avi {
            if !(1..=31).contains(&q_v_avi) {
                return Err("q:v は 1〜31 の範囲で指定してください".into());
            }
        }

        if let Some(audio) = &self.audio {
            audio.validate(output_format)?;
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
