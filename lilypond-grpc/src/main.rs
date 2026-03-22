mod pool;
mod template;

use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use std::sync::Arc;
use tonic::{Request, Response, Status, transport::Server};
use tonic_reflection::server::Builder as ReflectionBuilder;
use tracing::{error, info};

pub mod proto {
    tonic::include_proto!("lilypond");
}

use proto::lily_pond_service_server::{LilyPondService, LilyPondServiceServer};
use proto::{Clef, RenderRequest, RenderResponse};

pub struct LilyPondServer {
    pool: Arc<pool::LilyPondPool>,
}

#[tonic::async_trait]
impl LilyPondService for LilyPondServer {
    async fn render(
        &self,
        request: Request<RenderRequest>,
    ) -> Result<Response<RenderResponse>, Status> {
        let req = request.into_inner();

        info!(
            clef = ?Clef::try_from(req.clef).unwrap_or(Clef::Treble),
            key = %req.key,
            notes = %req.notes,
            "Received render request"
        );

        let source = template::render_template(&req);

        match self.pool.render(&source).await {
            Ok(result) => {
                let encoded = BASE64.encode(&result.png_bytes);
                info!(
                    png_size = result.png_bytes.len(),
                    base64_size = encoded.len(),
                    "Render successful"
                );
                Ok(Response::new(RenderResponse {
                    png_base64: encoded,
                    error: String::new(),
                }))
            }
            Err(e) => {
                error!(error = %e, "Render failed");
                Ok(Response::new(RenderResponse {
                    png_base64: String::new(),
                    error: e,
                }))
            }
        }
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "lilypond_grpc=info".into()),
        )
        .init();

    let max_concurrent: usize = std::env::var("LILYPOND_POOL_SIZE")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(4);

    let lilypond_bin = std::env::var("LILYPOND_BIN").ok();

    let addr = std::env::var("LISTEN_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:50051".to_string())
        .parse()?;

    let pool = Arc::new(pool::LilyPondPool::new(max_concurrent, lilypond_bin));
    let server = LilyPondServer { pool };

    info!(%addr, max_concurrent, "Starting LilyPond gRPC server");

    let reflection_service = ReflectionBuilder::configure()
        .register_encoded_file_descriptor_set(tonic::include_file_descriptor_set!(
            "lilypond_descriptor"
        ))
        .build_v1()?;

    Server::builder()
        .add_service(reflection_service)
        .add_service(LilyPondServiceServer::new(server))
        .serve(addr)
        .await?;

    Ok(())
}
