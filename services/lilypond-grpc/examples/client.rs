// examples/client.rs
// Run with: cargo run --example client

use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;

pub mod proto {
    tonic::include_proto!("lilypond");
}

use proto::lily_pond_service_client::LilyPondServiceClient;
use proto::{Clef, RenderRequest};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut client = LilyPondServiceClient::connect("http://127.0.0.1:50051").await?;

    let request = tonic::Request::new(RenderRequest {
        clef: Clef::Treble as i32,
        key: r"c \major".to_string(),
        notes: "< c' e' g' > 1".to_string(),
    });

    let response = client.render(request).await?;
    let inner = response.into_inner();

    if !inner.error.is_empty() {
        eprintln!("Error: {}", inner.error);
        return Ok(());
    }

    let png_bytes = BASE64.decode(&inner.png_base64)?;
    std::fs::write("output.png", &png_bytes)?;
    println!("Wrote output.png ({} bytes)", png_bytes.len());

    Ok(())
}
