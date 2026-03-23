fn main() -> Result<(), Box<dyn std::error::Error>> {
    let out_dir = std::path::PathBuf::from(std::env::var("OUT_DIR")?);

    // Support both Docker builds (proto/ copied into crate root) and local dev
    // (shared proto/ lives one level up at services/proto/).
    let proto_dir = if std::path::Path::new("proto/lilypond.proto").exists() {
        "proto"
    } else if std::path::Path::new("../proto/lilypond.proto").exists() {
        "../proto"
    } else {
        panic!(
            "Could not find lilypond.proto. Expected it at proto/lilypond.proto \
             (Docker) or ../proto/lilypond.proto (local dev)."
        );
    };

    let proto_file = format!("{proto_dir}/lilypond.proto");

    tonic_prost_build::configure()
        .file_descriptor_set_path(out_dir.join("lilypond_descriptor.bin"))
        .compile_protos(&[proto_file.as_str()], &[proto_dir])?;

    Ok(())
}
