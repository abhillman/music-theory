use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Arc;

use tempfile::TempDir;
use tokio::process::Command;
use tokio::sync::Semaphore;
use tracing::{debug, error, info};

/// Pool that limits concurrent LilyPond renders and manages temp directories.
pub struct LilyPondPool {
    semaphore: Arc<Semaphore>,
    lilypond_bin: String,
}

pub struct RenderResult {
    pub png_bytes: Vec<u8>,
}

pub struct RenderSvgResult {
    pub svg_bytes: Vec<u8>,
}

impl LilyPondPool {
    /// Create a new pool with the given concurrency limit.
    pub fn new(max_concurrent: usize, lilypond_bin: Option<String>) -> Self {
        let bin = lilypond_bin.unwrap_or_else(|| "lilypond".to_string());
        info!(
            max_concurrent = max_concurrent,
            lilypond_bin = %bin,
            "Initializing LilyPond process pool"
        );
        Self {
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            lilypond_bin: bin,
        }
    }

    /// Render a LilyPond source string to a PNG, returning the raw bytes.
    pub async fn render(&self, source: &str) -> Result<RenderResult, String> {
        // Acquire a permit (blocks if pool is fully utilized)
        let _permit = self
            .semaphore
            .acquire()
            .await
            .map_err(|e| format!("Failed to acquire pool permit: {e}"))?;

        debug!("Acquired pool permit, starting render");

        let tmp_dir = TempDir::new().map_err(|e| format!("Failed to create temp dir: {e}"))?;
        let input_path = tmp_dir.path().join("input.ly");
        let output_stem = tmp_dir.path().join("input");

        // Write the .ly source file
        tokio::fs::write(&input_path, source)
            .await
            .map_err(|e| format!("Failed to write input file: {e}"))?;

        // Run lilypond
        let output = Command::new(&self.lilypond_bin)
            .args([
                "-dcrop",
                "-dresolution=600",
                "--png",
                "-o",
                output_stem.to_str().unwrap(),
                input_path.to_str().unwrap(),
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute lilypond: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!(%stderr, "LilyPond render failed");
            return Err(format!("LilyPond error: {stderr}"));
        }

        // LilyPond with -dcrop produces <name>.cropped.png
        let cropped_path = tmp_dir.path().join("input.cropped.png");
        let plain_path = tmp_dir.path().join("input.png");

        let png_path = find_output(&cropped_path, &plain_path, "PNG")?;

        let png_bytes = tokio::fs::read(&png_path)
            .await
            .map_err(|e| format!("Failed to read output PNG: {e}"))?;

        debug!(size_bytes = png_bytes.len(), "Render complete");

        Ok(RenderResult { png_bytes })
    }

    /// Render a LilyPond source string to an SVG, returning the raw bytes.
    pub async fn render_svg(&self, source: &str) -> Result<RenderSvgResult, String> {
        // Acquire a permit (blocks if pool is fully utilized)
        let _permit = self
            .semaphore
            .acquire()
            .await
            .map_err(|e| format!("Failed to acquire pool permit: {e}"))?;

        debug!("Acquired pool permit, starting SVG render");

        let tmp_dir = TempDir::new().map_err(|e| format!("Failed to create temp dir: {e}"))?;
        let input_path = tmp_dir.path().join("input.ly");
        let output_stem = tmp_dir.path().join("input");

        // Write the .ly source file
        tokio::fs::write(&input_path, source)
            .await
            .map_err(|e| format!("Failed to write input file: {e}"))?;

        // Run lilypond with --svg instead of --png
        let output = Command::new(&self.lilypond_bin)
            .args([
                "-dcrop",
                "--svg",
                "-o",
                output_stem.to_str().unwrap(),
                input_path.to_str().unwrap(),
            ])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| format!("Failed to execute lilypond: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            error!(%stderr, "LilyPond SVG render failed");
            return Err(format!("LilyPond error: {stderr}"));
        }

        // LilyPond with -dcrop produces <name>.cropped.svg
        let cropped_path = tmp_dir.path().join("input.cropped.svg");
        let plain_path = tmp_dir.path().join("input.svg");

        let svg_path = find_output(&cropped_path, &plain_path, "SVG")?;

        let svg_bytes = tokio::fs::read(&svg_path)
            .await
            .map_err(|e| format!("Failed to read output SVG: {e}"))?;

        debug!(size_bytes = svg_bytes.len(), "SVG render complete");

        Ok(RenderSvgResult { svg_bytes })
    }
}

/// Try to find the output file — LilyPond naming varies by version.
fn find_output(cropped: &PathBuf, plain: &PathBuf, format_name: &str) -> Result<PathBuf, String> {
    if cropped.exists() {
        Ok(cropped.clone())
    } else if plain.exists() {
        Ok(plain.clone())
    } else {
        Err(format!(
            "LilyPond did not produce an output {format_name} file"
        ))
    }
}
