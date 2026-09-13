use serde::Serialize;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionProgress {
    pub conversion_id: String,
    pub progress: Option<u8>,
    pub state: &'static str,
}

pub fn percentage(line: &str, duration_ms: Option<u64>) -> Option<u8> {
    let duration_ms = duration_ms?;
    let out_time_us = line.strip_prefix("out_time_us=")?.parse::<u64>().ok()?;
    Some(((out_time_us / 1_000).saturating_mul(100) / duration_ms).min(99) as u8)
}

#[cfg(test)]
mod tests {
    use super::percentage;

    #[test]
    fn calculates_progress_and_keeps_completion_for_the_final_event() {
        assert_eq!(percentage("out_time_us=5000000", Some(10_000)), Some(50));
        assert_eq!(percentage("out_time_us=15000000", Some(10_000)), Some(99));
    }
}
