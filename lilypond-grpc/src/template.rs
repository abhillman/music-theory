use crate::proto::{Clef, RenderRequest};

impl Clef {
    pub fn as_lilypond(&self) -> &'static str {
        match self {
            Clef::Treble => "treble",
            Clef::Bass => "bass",
            Clef::Alto => "alto",
            Clef::Tenor => "tenor",
            Clef::Soprano => "soprano",
            Clef::MezzoSoprano => "mezzosoprano",
            Clef::Baritone => "baritone",
            Clef::Percussion => "percussion",
            Clef::Tab => "tab",
        }
    }
}

pub fn render_template(req: &RenderRequest) -> String {
    let clef = Clef::try_from(req.clef).unwrap_or(Clef::Treble);
    let key = if req.key.is_empty() {
        r"c \major".to_string()
    } else {
        req.key
            .strip_prefix(r"\key")
            .map(|s| s.trim_start().to_string())
            .unwrap_or_else(|| req.key.clone())
    };
    let notes = if req.notes.is_empty() {
        "<c e g>1".to_string()
    } else {
        req.notes.clone()
    };

    format!(
        r#"\version "2.24.0"

{{
  \omit Staff.TimeSignature
  \omit Staff.BarLine
  \clef {clef}
  \key {key}
  {notes}
}}"#,
        clef = clef.as_lilypond(),
        key = key,
        notes = notes,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_template() {
        let req = RenderRequest {
            clef: Clef::Treble as i32,
            key: String::new(),
            notes: String::new(),
        };
        let output = render_template(&req);
        assert!(output.contains(r"\clef treble"));
        assert!(output.contains(r"\key c \major"));
        assert!(output.contains("<c e g>1"));
    }

    #[test]
    fn test_custom_template() {
        let req = RenderRequest {
            clef: Clef::Bass as i32,
            key: r"d \minor".to_string(),
            notes: "d4 e f g".to_string(),
        };
        let output = render_template(&req);
        assert!(output.contains(r"\clef bass"));
        assert!(output.contains(r"\key d \minor"));
        assert!(output.contains("d4 e f g"));
    }
}
