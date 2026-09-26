use serde::Serialize;

#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCode {
    ConversionCancelled,
    FfmpegUnavailable,
    FfmpegStartFailed,
    ConversionFailed,
    TempDirCreationFailed,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    pub code: ErrorCode,
}

#[derive(Debug)]
pub struct ConversionError {
    pub code: ErrorCode,
}

impl ConversionError {
    pub fn new(code: ErrorCode) -> Self {
        Self { code }
    }
}
impl From<ConversionError> for ApiError {
    fn from(error: ConversionError) -> Self {
        Self { code: error.code }
    }
}
