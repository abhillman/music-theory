import React, { useState, useCallback, useEffect, useRef } from "react";
import { musicTheoryClient, chordImageClient } from "../client";
import { RomanNumeralRequest } from "../gen/musictheory_pb";
import { RenderRomanNumeralRequest } from "../gen/chordimage_pb";
import "./RomanNumeralAnalyzer.css";

/* ── Field metadata: summary tooltips, sidebar descriptions, doc URLs ── */
const CHORD_DOC =
  "https://music21.org/music21docs/moduleReference/moduleChord.html#music21.chord.Chord";
const ROMAN_DOC =
  "https://music21.org/music21docs/moduleReference/moduleRoman.html#music21.roman.RomanNumeral";
const LILY_DOC = "https://lilypond.org/doc/v2.24/Documentation/notation/index";

interface FieldInfo {
  label: string;
  summary: string;
  description: string;
  url: string;
}

const FIELD_INFO: Record<string, FieldInfo> = {
  /* ── Most useful: identity & naming ─────────────────────────── */
  commonName: {
    label: "Common Name",
    summary: "The standard name for this chord type (e.g. 'major triad').",
    description:
      "The common name describes the chord quality in plain English — for example 'major triad', 'minor seventh chord', or 'dominant seventh chord'. It is determined by the intervallic structure of the chord without reference to a specific root pitch.",
    url: `${CHORD_DOC}.commonName`,
  },
  figureAndKey: {
    label: "Figure & Key",
    summary: "The full Roman numeral figure in its key context.",
    description:
      "A human-readable string combining the Roman numeral figure with its key, e.g. 'V in C major' or 'viio in A minor'. This is the most concise way to describe the chord's harmonic function and context.",
    url: `${ROMAN_DOC}.figureAndKey`,
  },
  pitches: {
    label: "Pitches",
    summary: "The note names that make up this chord.",
    description:
      "Returns a tuple of all Pitch objects in this Chord, ordered from lowest to highest. Each pitch is identified by its letter name and optional accidental (e.g. G, B, D for a G major triad).",
    url: `${CHORD_DOC}.pitches`,
  },
  quality: {
    label: "Quality",
    summary: "Major, minor, diminished, or augmented character.",
    description:
      "The quality describes the intervallic makeup of the underlying triad: major (M3 + m3), minor (m3 + M3), diminished (m3 + m3), augmented (M3 + M3), or 'other' for non-tertian sonorities. The 'implied quality' comes from the Roman numeral figure itself.",
    url: `${CHORD_DOC}.quality`,
  },
  /* ── Core pitch identity ────────────────────────────────────── */
  root: {
    label: "Root",
    summary: "The fundamental note the chord is built upon.",
    description:
      "The root is the note from which the chord is constructed by stacking thirds. It may differ from the bass note when the chord is inverted. Music21 uses an algorithm that finds the pitch with the most thirds stacked above it.",
    url: `${CHORD_DOC}.root`,
  },
  bass: {
    label: "Bass",
    summary: "The lowest-sounding note of the chord.",
    description:
      "The bass is simply the lowest pitch in the chord voicing. In root position, the bass and root are the same note. In inversions, the bass is a different chord tone (the third, fifth, or seventh).",
    url: `${CHORD_DOC}.bass`,
  },
  chordTones: {
    label: "Chord Tones",
    summary: "Individual members of the chord by function.",
    description:
      "Identifies each pitch by its role within the chord: root (1st), third (3rd), fifth (5th), and seventh (7th) if present. These are diatonic steps above the root, not scale degrees.",
    url: `${CHORD_DOC}.third`,
  },
  /* ── Voicing & inversion ────────────────────────────────────── */
  inversion: {
    label: "Inversion",
    summary: "Which chord tone is in the bass voice.",
    description:
      "Root position means the root is the lowest note. First inversion puts the third in the bass, second inversion puts the fifth in the bass, and third inversion (for seventh chords) puts the seventh in the bass. The figured-bass numbers indicate intervals above the bass.",
    url: `${CHORD_DOC}.inversionText`,
  },
  figuredBass: {
    label: "Figured Bass",
    summary: "Shorthand numbers indicating intervals above the bass note.",
    description:
      "Figured bass is a Baroque-era shorthand where numbers below a bass note indicate the intervals above it. Root-position triads are '5,3' (usually omitted), first-inversion triads are '6,3' (abbreviated '6'), and seventh chords use figures like '7', '6,5', '4,3', or '4,2' depending on inversion.",
    url: `${ROMAN_DOC}.figureAndKey`,
  },
  intervals: {
    label: "Intervals",
    summary: "Distances from the bass note to each upper voice.",
    description:
      "Shows the interval between the bass and every other pitch in the chord, using standard abbreviations like M3 (major third), P5 (perfect fifth), m7 (minor seventh), etc. This is closely related to figured-bass notation.",
    url: `${CHORD_DOC}.annotateIntervals`,
  },
  semitones: {
    label: "Semitones",
    summary: "Half-step distances from the root for each chord step.",
    description:
      "Shows the number of semitones (mod 12) above the root for each present chord step. For example, a major triad returns [0, 4, 7] — 0 for the root, 4 half-steps to the major third, and 7 to the perfect fifth.",
    url: `${CHORD_DOC}.semitonesFromChordStep`,
  },
  /* ── Harmonic function ──────────────────────────────────────── */
  scaleDegree: {
    label: "Scale Degree",
    summary: "Position of the chord's root within the key.",
    description:
      "An integer (1–7) showing where the chord root sits in the scale. Each degree has a traditional name: 1 = Tonic, 2 = Supertonic, 3 = Mediant, 4 = Subdominant, 5 = Dominant, 6 = Submediant, 7 = Leading Tone.",
    url: `${ROMAN_DOC}.scaleDegree`,
  },
  functionality: {
    label: "Functionality",
    summary: "How harmonically 'important' this chord is (1–100).",
    description:
      "A heuristic score from music21 representing relative functional importance. V7 scores ~80 (strong dominant pull), while vi6 scores ~10 (coloristic). For secondary dominants like V/vi, scores are multiplied — e.g., V (70) × vi (40) / 100 = 28.",
    url: `${ROMAN_DOC}.functionalityScore`,
  },
  flags: {
    label: "Flags",
    summary: "Boolean chord-type classifications.",
    description:
      "A set of true/false tests that identify specific chord types: major triad, minor triad, dominant seventh, diminished seventh, half-diminished seventh, augmented sixth, augmented triad, diminished triad, Neapolitan, and consonance. Each flag is determined by the chord's intervallic structure and spelling.",
    url: `${CHORD_DOC}.isMajorTriad`,
  },
  /* ── Set theory ─────────────────────────────────────────────── */
  pitchClasses: {
    label: "Pitch Classes",
    summary: "Numeric representation of each pitch (0 = C, 1 = C♯, … 11 = B).",
    description:
      "Pitch classes reduce all octave equivalents to a single integer 0–11 (C = 0, C♯/D♭ = 1, D = 2, etc.). This representation is central to post-tonal set theory and allows comparison of chords regardless of voicing or octave.",
    url: `${CHORD_DOC}.pitchClasses`,
  },
  primeForm: {
    label: "Prime Form",
    summary: "Most compact set-theory representation of the chord.",
    description:
      "The prime form transposes and (if necessary) inverts the pitch-class set so it starts on 0 and is as compact as possible. Major and minor triads both reduce to [0, 3, 7]. This allows comparison of chord 'shapes' regardless of transposition or inversion.",
    url: `${CHORD_DOC}.primeForm`,
  },
  forteClass: {
    label: "Forte Class",
    summary: "Allen Forte's catalog number for this set class.",
    description:
      "A label from Allen Forte's catalog of pitch-class sets, in the form 'X-Y' where X is the number of pitch classes (cardinality) and Y is the catalog number. The suffix A/B distinguishes inversionally related sets (e.g. 3-11A = minor triad, 3-11B = major triad).",
    url: `${CHORD_DOC}.forteClass`,
  },
  intervalVector: {
    label: "Interval Vector",
    summary: "Tally of each interval class in the chord.",
    description:
      "A six-element vector counting how many of each interval class (ic1 through ic6) the chord contains. For example, a major triad <001110> has one minor third (ic3), one major third (ic4), and one perfect fifth (ic5). Z-related sets share the same vector.",
    url: `${CHORD_DOC}.intervalVector`,
  },
  /* ── Engraving ──────────────────────────────────────────────── */
  lilypond: {
    label: "LilyPond",
    summary: "The chord in LilyPond music engraving syntax.",
    description:
      "LilyPond is an open-source music engraving program. This field shows the chord as a LilyPond code snippet that can be pasted directly into a .ly file to produce beautiful notation. Pitches use Dutch naming (e.g., 'cis' for C♯, 'bes' for B♭).",
    url: LILY_DOC,
  },
  lilypondKey: {
    label: "LilyPond Key",
    summary: "The key signature in LilyPond syntax.",
    description:
      "The \\key command in LilyPond format, e.g. '\\key c \\major'. This can be placed at the beginning of a LilyPond score to set the key signature for the notation.",
    url: LILY_DOC,
  },
};

/** Double the width and height attributes in an SVG string. */
function scaleSvg(svg: string, factor: number = 2): string {
  return svg.replace(
    /(<svg[^>]*?\b)(width)="([^"]+)"([^>]*?\b)(height)="([^"]+)"/i,
    (_match, pre, wAttr, wVal, mid, hAttr, hVal) => {
      const w = parseFloat(wVal);
      const h = parseFloat(hVal);
      const wUnit = wVal.replace(/[\d.]+/, "");
      const hUnit = hVal.replace(/[\d.]+/, "");
      return `${pre}${wAttr}="${w * factor}${wUnit}"${mid}${hAttr}="${h * factor}${hUnit}"`;
    },
  );
}

interface AnalysisResult {
  inputRomanNumeral: string;
  key: string;
  inversionText: string;
  inversionNumber: number;
  commonName: string;
  figuredBassNumbers: number[];
  figuredBassString: string;
  pitchNames: string[];
  bassPitch: string;
  rootPitch: string;
  quality: string;
  isMajorTriad: boolean;
  isMinorTriad: boolean;
  isDominantSeventh: boolean;
  isDiminishedSeventh: boolean;
  isAugmentedSixth: boolean;
  scaleDegree: number;
  scaleDegreeName: string;
  pitchClasses: number[];
  forteClass: string;
  lilypondChord: string;
  lilypondKey: string;
  // New fields
  intervalsFromBass: string[];
  pitchedCommonName: string;
  primeForm: number[];
  intervalVector: number[];
  figureAndKey: string;
  functionalityScore: number;
  isNeapolitan: boolean;
  isHalfDiminishedSeventh: boolean;
  isAugmentedTriad: boolean;
  isDiminishedTriad: boolean;
  isConsonant: boolean;
  isTriad: boolean;
  isSeventh: boolean;
  impliedQuality: string;
  semitonesFromRoot: number[];
  thirdPitch: string;
  fifthPitch: string;
  seventhPitch: string;
}

const KEYS = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "Gb",
  "F",
  "Bb",
  "Eb",
  "Ab",
  "Db",
  "a",
  "e",
  "b",
  "f#",
  "c#",
  "g#",
  "d#",
  "d",
  "g",
  "c",
  "f",
  "bb",
  "eb",
];

/* ── Interactive label component ──────────────────────────────────── */
function FieldLabel({
  field,
  activeField,
  onSelect,
}: {
  field: string;
  activeField: string | null;
  onSelect: (field: string) => void;
}) {
  const info = FIELD_INFO[field];
  if (!info) return <th>{field}</th>;
  return (
    <th
      className={`field-label${activeField === field ? " field-label--active" : ""}`}
      onClick={() => onSelect(field)}
      title={info.summary}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(field);
        }
      }}
    >
      {info.label}
    </th>
  );
}

export default function RomanNumeralAnalyzer() {
  const [romanNumeral, setRomanNumeral] = useState("V");
  const [key, setKey] = useState("C");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [chordSvg, setChordSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAcknowledgements, setShowAcknowledgements] = useState(false);
  const [sidebarField, setSidebarField] = useState<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const openSidebar = useCallback((field: string) => {
    setSidebarField((prev) => (prev === field ? null : field));
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarField(null);
  }, []);

  // Close sidebar on Escape
  useEffect(() => {
    function handleEscapeSidebar(e: KeyboardEvent) {
      if (e.key === "Escape" && sidebarField) {
        closeSidebar();
      }
    }
    document.addEventListener("keydown", handleEscapeSidebar);
    return () => document.removeEventListener("keydown", handleEscapeSidebar);
  }, [sidebarField, closeSidebar]);

  // Close tooltip when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setShowTooltip(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowTooltip(false);
      }
    }
    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showTooltip]);

  const openAcknowledgements = () => {
    setShowAcknowledgements(true);
    dialogRef.current?.showModal();
  };

  const closeAcknowledgements = () => {
    dialogRef.current?.close();
    setShowAcknowledgements(false);
  };

  const footerStyles = `
    .app-footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--border-light);
    }
    .app-footer .ack-link {
      background: none;
      border: none;
      color: var(--text-tertiary);
      font-size: 0.8rem;
      font-family: var(--font-sans);
      font-weight: 500;
      cursor: pointer;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
      transition: color var(--transition-fast), background var(--transition-fast);
    }
    .app-footer .ack-link:hover {
      color: var(--accent);
      background: var(--accent-light);
    }
    .app-footer .copyright {
      font-size: 0.72rem;
      color: var(--text-tertiary);
      opacity: 0.6;
      font-weight: 400;
      letter-spacing: 0.02em;
    }

    /* ── Dialog shell ─────────────────────────────────────────── */
    .ack-dialog {
      border: none;
      border-radius: var(--radius-lg);
      padding: 0;
      max-width: 540px;
      width: 90vw;
      margin: auto;
      position: fixed;
      inset: 0;
      height: fit-content;
      max-height: 85vh;
      overflow-y: auto;
      background: var(--bg-secondary);
      box-shadow: var(--shadow-lg), 0 0 0 1px var(--border-light);
      animation: dialog-in 0.2s ease;
    }
    .ack-dialog::backdrop {
      background: rgba(45, 43, 40, 0.4);
      backdrop-filter: blur(2px);
    }
    @keyframes dialog-in {
      from { opacity: 0; transform: translateY(8px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* ── Content wrapper ──────────────────────────────────────── */
    .ack-content {
      padding: 1.75rem 1.75rem 1.5rem;
    }

    /* ── Header row ───────────────────────────────────────────── */
    .ack-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.35rem;
    }
    .ack-header h2 {
      font-family: var(--font-serif);
      font-size: 1.3rem;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }
    .ack-close {
      background: none;
      border: none;
      font-size: 1rem;
      color: var(--text-tertiary);
      cursor: pointer;
      padding: 0.3rem 0.5rem;
      border-radius: var(--radius-sm);
      line-height: 1;
      transition: color var(--transition-fast), background var(--transition-fast);
    }
    .ack-close:hover {
      color: var(--text-primary);
      background: var(--bg-surface);
    }

    /* ── Intro line ───────────────────────────────────────────── */
    .ack-intro {
      font-size: 0.82rem;
      color: var(--text-tertiary);
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }

    /* ── Category groups ──────────────────────────────────────── */
    .ack-group {
      margin-bottom: 1.25rem;
    }
    .ack-group:last-child {
      margin-bottom: 0;
    }
    .ack-group-label {
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--text-tertiary);
      margin-bottom: 0.5rem;
      padding-left: 0.1rem;
    }

    /* ── Dependency rows ──────────────────────────────────────── */
    .ack-table {
      width: 100%;
      border-collapse: collapse;
    }
    .ack-table tr {
      border-bottom: 1px solid var(--border-light);
      transition: background var(--transition-fast);
    }
    .ack-table tr:last-child {
      border-bottom: none;
    }
    .ack-table tr:hover {
      background: var(--bg-surface);
    }
    .ack-table td {
      padding: 0.55rem 0.65rem;
      vertical-align: middle;
      line-height: 1.5;
    }

    /* Name cell */
    .ack-name {
      width: 110px;
      white-space: nowrap;
    }
    .ack-name a {
      color: var(--accent);
      text-decoration: none;
      transition: color var(--transition-fast);
    }
    .ack-name a:hover {
      color: var(--accent-hover);
      text-decoration: underline;
    }
    .ack-name code {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      font-weight: 600;
    }

    /* Description cell */
    .ack-desc {
      font-size: 0.82rem;
      color: var(--text-secondary);
    }

    /* License badge */
    .ack-license {
      width: 1%;
      white-space: nowrap;
      text-align: right;
    }
    .ack-badge {
      display: inline-block;
      font-size: 0.62rem;
      font-weight: 600;
      font-family: var(--font-mono);
      letter-spacing: 0.03em;
      text-transform: uppercase;
      color: var(--text-tertiary);
      background: var(--bg-surface);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-full);
      padding: 0.15rem 0.5rem;
    }
  `;

  const analyze = useCallback(async () => {
    if (!romanNumeral.trim()) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setChordSvg(null);

    try {
      // ── (a) Analyze Roman Numeral ──────────────────────────────
      const analyzeReq = new RomanNumeralRequest();
      analyzeReq.setRomanNumeral(romanNumeral.trim());
      analyzeReq.setKey(key);

      const analyzeRes = await new Promise<AnalysisResult>(
        (resolve, reject) => {
          musicTheoryClient.analyzeRomanNumeral(analyzeReq, {}, (err, res) => {
            if (err) {
              reject(new Error(err.message));
              return;
            }
            if (!res) {
              reject(new Error("Empty response"));
              return;
            }
            resolve({
              inputRomanNumeral: res.getInputRomanNumeral(),
              key: res.getKey(),
              inversionText: res.getInversionText(),
              inversionNumber: res.getInversionNumber(),
              commonName: res.getCommonName(),
              figuredBassNumbers: res.getFiguredBassNumbersList(),
              figuredBassString: res.getFiguredBassString(),
              pitchNames: res.getPitchNamesList(),
              bassPitch: res.getBassPitch(),
              rootPitch: res.getRootPitch(),
              quality: res.getQuality(),
              isMajorTriad: res.getIsMajorTriad(),
              isMinorTriad: res.getIsMinorTriad(),
              isDominantSeventh: res.getIsDominantSeventh(),
              isDiminishedSeventh: res.getIsDiminishedSeventh(),
              isAugmentedSixth: res.getIsAugmentedSixth(),
              scaleDegree: res.getScaleDegree(),
              scaleDegreeName: res.getScaleDegreeName(),
              pitchClasses: res.getPitchClassesList(),
              forteClass: res.getForteClass(),
              lilypondChord: res.getLilypondChord(),
              lilypondKey: res.getLilypondKey(),
              // New fields
              intervalsFromBass: res.getIntervalsFromBassList(),
              pitchedCommonName: res.getPitchedCommonName(),
              primeForm: res.getPrimeFormList(),
              intervalVector: res.getIntervalVectorList(),
              figureAndKey: res.getFigureAndKey(),
              functionalityScore: res.getFunctionalityScore(),
              isNeapolitan: res.getIsNeapolitan(),
              isHalfDiminishedSeventh: res.getIsHalfDiminishedSeventh(),
              isAugmentedTriad: res.getIsAugmentedTriad(),
              isDiminishedTriad: res.getIsDiminishedTriad(),
              isConsonant: res.getIsConsonant(),
              isTriad: res.getIsTriad(),
              isSeventh: res.getIsSeventh(),
              impliedQuality: res.getImpliedQuality(),
              semitonesFromRoot: res.getSemitonesFromRootList(),
              thirdPitch: res.getThirdPitch(),
              fifthPitch: res.getFifthPitch(),
              seventhPitch: res.getSeventhPitch(),
            });
          });
        },
      );

      setAnalysis(analyzeRes);

      // ── (b) Render Chord SVG ───────────────────────────────────
      const imageReq = new RenderRomanNumeralRequest();
      imageReq.setRomanNumeral(romanNumeral.trim());
      imageReq.setKey(key);

      const svgRes = await new Promise<string>((resolve, reject) => {
        chordImageClient.renderRomanNumeralSvg(imageReq, {}, (err, res) => {
          if (err) {
            reject(new Error(err.message));
            return;
          }
          if (!res) {
            reject(new Error("Empty SVG response"));
            return;
          }
          const errMsg = res.getError();
          if (errMsg) {
            reject(new Error(errMsg));
            return;
          }
          resolve(res.getSvg());
        });
      });

      setChordSvg(scaleSvg(svgRes, 1.6));
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [romanNumeral, key]);

  // Automatically analyze the default chord on mount
  useEffect(() => {
    analyze();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") analyze();
  };

  const sidebarInfo = sidebarField ? FIELD_INFO[sidebarField] : null;

  return (
    <div className={`analyzer${sidebarField ? " analyzer--sidebar-open" : ""}`}>
      <style>{footerStyles}</style>
      <h1>Roman Numeral Analyzer</h1>
      <p className="subtitle">
        Analyze chords, inversions, and figured bass in any key.
      </p>

      <div className="input-row">
        <div className="field">
          <label htmlFor="roman">Roman Numeral</label>
          <div className="input-with-help" ref={tooltipRef}>
            <input
              id="roman"
              type="text"
              value={romanNumeral}
              onChange={(e) => setRomanNumeral(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. V, viio, IV6, bII"
              autoFocus
            />
            <button
              type="button"
              className="help-toggle"
              aria-label="Syntax help"
              onClick={() => setShowTooltip((prev) => !prev)}
            >
              ?
            </button>
            {showTooltip && (
              <div className="help-tooltip">
                <div className="help-header">
                  <span className="help-title">Syntax Guide</span>
                  <span className="help-subtitle">
                    Uses{" "}
                    <a
                      href="https://music21.org/music21docs/moduleReference/moduleRoman.html"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      music21
                    </a>{" "}
                    Roman numeral syntax.
                  </span>
                </div>

                <table className="help-table">
                  <thead>
                    <tr>
                      <th>Result</th>
                      <th>Type</th>
                      <th>Syntax</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Major / Minor</td>
                      <td>Case</td>
                      <td>
                        <code>V</code> / <code>v</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Diminished</td>
                      <td>Append</td>
                      <td>
                        <code>o</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Augmented</td>
                      <td>Append</td>
                      <td>
                        <code>+</code>
                      </td>
                    </tr>
                    <tr>
                      <td>7th Chord</td>
                      <td>Append</td>
                      <td>
                        <code>7</code>
                      </td>
                    </tr>
                    <tr>
                      <td>Alterations</td>
                      <td>Chromatic</td>
                      <td>
                        <code>b</code> / <code>#</code>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="help-examples">
                  <span className="help-examples-label">Examples:</span>
                  <span>
                    <code>viio</code> <span className="help-dot">·</span>{" "}
                    <code>IV6</code> <span className="help-dot">·</span>{" "}
                    <code>bII</code>
                  </span>
                </div>

                <a
                  className="help-link"
                  href="https://learnmusictheory.net/PDFs/pdffiles/01-05-02-RomanNumerals.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Roman numeral cheat-sheet ↗
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="key">Key</label>
          <select id="key" value={key} onChange={(e) => setKey(e.target.value)}>
            {KEYS.map((k) => (
              <option key={k} value={k}>
                {k} {k === k.toLowerCase() ? "minor" : "major"}
              </option>
            ))}
          </select>
        </div>

        <button onClick={analyze} disabled={loading}>
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {analysis && (
        <div className="results">
          {/* ── Chord SVG ────────────────────────────────────────── */}
          {chordSvg && (
            <div
              className="chord-image"
              dangerouslySetInnerHTML={{ __html: chordSvg }}
            />
          )}

          {/* ── Summary Header ───────────────────────────────────── */}
          <div className="summary-header">
            <span className="roman">{analysis.inputRomanNumeral}</span>
            <span className="in-key">in {analysis.key}</span>
            <span className="chord-name">
              {analysis.pitchedCommonName ||
                `${analysis.rootPitch} ${analysis.commonName}`}
            </span>
          </div>

          {/* ── Detail Table ─────────────────────────────────────── */}
          <table className="detail-table">
            <tbody>
              {/* ── Identity & Naming ────────────────────────────── */}
              {analysis.commonName && (
                <tr
                  className={sidebarField === "commonName" ? "row--active" : ""}
                >
                  <FieldLabel
                    field="commonName"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>{analysis.commonName}</td>
                </tr>
              )}
              {analysis.figureAndKey && (
                <tr
                  className={
                    sidebarField === "figureAndKey" ? "row--active" : ""
                  }
                >
                  <FieldLabel
                    field="figureAndKey"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>{analysis.figureAndKey}</td>
                </tr>
              )}
              <tr className={sidebarField === "pitches" ? "row--active" : ""}>
                <FieldLabel
                  field="pitches"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>{analysis.pitchNames.join(" – ")}</td>
              </tr>
              <tr className={sidebarField === "quality" ? "row--active" : ""}>
                <FieldLabel
                  field="quality"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>
                  {analysis.quality}
                  {analysis.impliedQuality &&
                    analysis.impliedQuality !== analysis.quality &&
                    ` (implied: ${analysis.impliedQuality})`}
                </td>
              </tr>

              {/* ── Core pitch identity ──────────────────────────── */}
              <tr className={sidebarField === "root" ? "row--active" : ""}>
                <FieldLabel
                  field="root"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>{analysis.rootPitch}</td>
              </tr>
              <tr className={sidebarField === "bass" ? "row--active" : ""}>
                <FieldLabel
                  field="bass"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>{analysis.bassPitch}</td>
              </tr>
              {/* ── Chord Tones ──────────────────────────────────── */}
              {(analysis.thirdPitch ||
                analysis.fifthPitch ||
                analysis.seventhPitch) && (
                <tr
                  className={sidebarField === "chordTones" ? "row--active" : ""}
                >
                  <FieldLabel
                    field="chordTones"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>
                    {[
                      analysis.rootPitch && `Root: ${analysis.rootPitch}`,
                      analysis.thirdPitch && `3rd: ${analysis.thirdPitch}`,
                      analysis.fifthPitch && `5th: ${analysis.fifthPitch}`,
                      analysis.seventhPitch && `7th: ${analysis.seventhPitch}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </td>
                </tr>
              )}

              {/* ── Voicing & Inversion ──────────────────────────── */}
              <tr className={sidebarField === "inversion" ? "row--active" : ""}>
                <FieldLabel
                  field="inversion"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>{analysis.inversionText}</td>
              </tr>
              {analysis.figuredBassString && (
                <tr
                  className={
                    sidebarField === "figuredBass" ? "row--active" : ""
                  }
                >
                  <FieldLabel
                    field="figuredBass"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>{analysis.figuredBassString}</td>
                </tr>
              )}
              {analysis.intervalsFromBass.length > 0 && (
                <tr
                  className={sidebarField === "intervals" ? "row--active" : ""}
                >
                  <FieldLabel
                    field="intervals"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>{analysis.intervalsFromBass.join(", ")}</td>
                </tr>
              )}
              {analysis.semitonesFromRoot.length > 0 && (
                <tr
                  className={sidebarField === "semitones" ? "row--active" : ""}
                >
                  <FieldLabel
                    field="semitones"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>[{analysis.semitonesFromRoot.join(", ")}]</td>
                </tr>
              )}

              {/* ── Harmonic Function ────────────────────────────── */}
              <tr
                className={sidebarField === "scaleDegree" ? "row--active" : ""}
              >
                <FieldLabel
                  field="scaleDegree"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>
                  {analysis.scaleDegree} — {analysis.scaleDegreeName}
                </td>
              </tr>
              {analysis.functionalityScore > 0 && (
                <tr
                  className={
                    sidebarField === "functionality" ? "row--active" : ""
                  }
                >
                  <FieldLabel
                    field="functionality"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>
                    <span className="functionality-bar-track">
                      <span
                        className="functionality-bar-fill"
                        style={{ width: `${analysis.functionalityScore}%` }}
                      />
                    </span>
                    <span className="functionality-score">
                      {analysis.functionalityScore}
                    </span>
                  </td>
                </tr>
              )}

              {/* Boolean flags — only show truthy ones */}
              {(analysis.isMajorTriad ||
                analysis.isMinorTriad ||
                analysis.isDominantSeventh ||
                analysis.isDiminishedSeventh ||
                analysis.isHalfDiminishedSeventh ||
                analysis.isAugmentedSixth ||
                analysis.isAugmentedTriad ||
                analysis.isDiminishedTriad ||
                analysis.isNeapolitan ||
                analysis.isTriad ||
                analysis.isSeventh ||
                analysis.isConsonant) && (
                <tr className={sidebarField === "flags" ? "row--active" : ""}>
                  <FieldLabel
                    field="flags"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td className="flags">
                    {analysis.isTriad && <span className="flag">Triad</span>}
                    {analysis.isSeventh && (
                      <span className="flag">Seventh</span>
                    )}
                    {analysis.isMajorTriad && (
                      <span className="flag">Major Triad</span>
                    )}
                    {analysis.isMinorTriad && (
                      <span className="flag">Minor Triad</span>
                    )}
                    {analysis.isAugmentedTriad && (
                      <span className="flag">Augmented Triad</span>
                    )}
                    {analysis.isDiminishedTriad && (
                      <span className="flag">Diminished Triad</span>
                    )}
                    {analysis.isDominantSeventh && (
                      <span className="flag">Dominant 7th</span>
                    )}
                    {analysis.isDiminishedSeventh && (
                      <span className="flag">Diminished 7th</span>
                    )}
                    {analysis.isHalfDiminishedSeventh && (
                      <span className="flag">Half-Dim 7th</span>
                    )}
                    {analysis.isAugmentedSixth && (
                      <span className="flag">Augmented 6th</span>
                    )}
                    {analysis.isNeapolitan && (
                      <span className="flag flag-special">Neapolitan</span>
                    )}
                    {analysis.isConsonant && (
                      <span className="flag flag-consonant">Consonant</span>
                    )}
                  </td>
                </tr>
              )}

              {/* ── Set Theory ───────────────────────────────────── */}
              <tr
                className={sidebarField === "pitchClasses" ? "row--active" : ""}
              >
                <FieldLabel
                  field="pitchClasses"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>[{analysis.pitchClasses.join(", ")}]</td>
              </tr>
              {analysis.primeForm.length > 0 && (
                <tr
                  className={sidebarField === "primeForm" ? "row--active" : ""}
                >
                  <FieldLabel
                    field="primeForm"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>[{analysis.primeForm.join(", ")}]</td>
                </tr>
              )}
              <tr
                className={sidebarField === "forteClass" ? "row--active" : ""}
              >
                <FieldLabel
                  field="forteClass"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>{analysis.forteClass || "—"}</td>
              </tr>
              {analysis.intervalVector.length > 0 && (
                <tr
                  className={
                    sidebarField === "intervalVector" ? "row--active" : ""
                  }
                >
                  <FieldLabel
                    field="intervalVector"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>&lt;{analysis.intervalVector.join("")}&gt;</td>
                </tr>
              )}

              {/* ── Engraving ────────────────────────────────────── */}
              <tr className={sidebarField === "lilypond" ? "row--active" : ""}>
                <FieldLabel
                  field="lilypond"
                  activeField={sidebarField}
                  onSelect={openSidebar}
                />
                <td>
                  <code>{analysis.lilypondChord}</code>
                </td>
              </tr>
              {analysis.lilypondKey && (
                <tr
                  className={
                    sidebarField === "lilypondKey" ? "row--active" : ""
                  }
                >
                  <FieldLabel
                    field="lilypondKey"
                    activeField={sidebarField}
                    onSelect={openSidebar}
                  />
                  <td>
                    <code>{analysis.lilypondKey}</code>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <div
        className={`sidebar-overlay${sidebarField ? " sidebar-overlay--visible" : ""}`}
        onClick={closeSidebar}
      />
      <aside
        ref={sidebarRef}
        className={`sidebar${sidebarField ? " sidebar--open" : ""}`}
      >
        {sidebarInfo && (
          <>
            <div className="sidebar-header">
              <h3 className="sidebar-title">{sidebarInfo.label}</h3>
              <button
                className="sidebar-close"
                onClick={closeSidebar}
                type="button"
                aria-label="Close sidebar"
              >
                ✕
              </button>
            </div>

            <div className="sidebar-body">
              <p className="sidebar-summary">{sidebarInfo.summary}</p>
              <p className="sidebar-description">{sidebarInfo.description}</p>

              <a
                className="sidebar-doc-link"
                href={sidebarInfo.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read full documentation ↗
              </a>

              <div className="sidebar-iframe-wrap">
                <div className="sidebar-iframe-label">
                  <span>music21 Reference</span>
                  <a
                    href={sidebarInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sidebar-iframe-ext"
                  >
                    ↗
                  </a>
                </div>
                <iframe
                  key={sidebarInfo.url}
                  src={sidebarInfo.url}
                  title={`Documentation: ${sidebarInfo.label}`}
                  className="sidebar-iframe"
                  sandbox="allow-scripts allow-same-origin allow-popups"
                />
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="app-footer">
        <button
          className="ack-link"
          onClick={openAcknowledgements}
          type="button"
        >
          Acknowledgements
        </button>
        <span className="copyright">© 2025 Aryeh Hillman</span>
      </footer>

      {/* ── Acknowledgements Dialog ─────────────────────────────── */}
      <dialog
        ref={dialogRef}
        className="ack-dialog"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeAcknowledgements();
        }}
      >
        <div className="ack-content">
          <div className="ack-header">
            <h2>Acknowledgements</h2>
            <button
              className="ack-close"
              onClick={closeAcknowledgements}
              type="button"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="ack-intro">Open-source tools that power this app.</p>

          {/* ── Music Engine ──────────────────────────────────── */}
          <div className="ack-group">
            <div className="ack-group-label">Music Engine</div>
            <table className="ack-table">
              <tbody>
                <tr>
                  <td className="ack-name">
                    <a
                      href="https://web.mit.edu/music21/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>music21</code>
                    </a>
                  </td>
                  <td className="ack-desc">
                    Toolkit for computer-aided musicology and music theory
                    analysis.
                  </td>
                  <td className="ack-license">
                    <span className="ack-badge">BSD-3</span>
                  </td>
                </tr>
                <tr>
                  <td className="ack-name">
                    <a
                      href="https://lilypond.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>lilypond</code>
                    </a>
                  </td>
                  <td className="ack-desc">
                    Music engraving software for high-quality sheet music
                    notation.
                  </td>
                  <td className="ack-license">
                    <span className="ack-badge">GPL-3</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Infrastructure ────────────────────────────────── */}
          <div className="ack-group">
            <div className="ack-group-label">Infrastructure</div>
            <table className="ack-table">
              <tbody>
                <tr>
                  <td className="ack-name">
                    <a
                      href="https://www.rust-lang.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>Rust</code>
                    </a>
                  </td>
                  <td className="ack-desc">
                    Systems language powering the LilyPond rendering service.
                  </td>
                  <td className="ack-license">
                    <span className="ack-badge">MIT / Apache-2</span>
                  </td>
                </tr>
                <tr>
                  <td className="ack-name">
                    <a
                      href="https://grpc.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>gRPC</code>
                    </a>
                  </td>
                  <td className="ack-desc">
                    High-performance RPC framework for service communication.
                  </td>
                  <td className="ack-license">
                    <span className="ack-badge">Apache-2</span>
                  </td>
                </tr>
                <tr>
                  <td className="ack-name">
                    <a
                      href="https://www.envoyproxy.io/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>envoy</code>
                    </a>
                  </td>
                  <td className="ack-desc">
                    Edge proxy powering the gRPC-Web gateway.
                  </td>
                  <td className="ack-license">
                    <span className="ack-badge">Apache-2</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Frontend ──────────────────────────────────────── */}
          <div className="ack-group">
            <div className="ack-group-label">Frontend</div>
            <table className="ack-table">
              <tbody>
                <tr>
                  <td className="ack-name">
                    <a
                      href="https://react.dev/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>react</code>
                    </a>
                  </td>
                  <td className="ack-desc">
                    UI components and state management.
                  </td>
                  <td className="ack-license">
                    <span className="ack-badge">MIT</span>
                  </td>
                </tr>
                <tr>
                  <td className="ack-name">
                    <a
                      href="https://github.com/grpc/grpc-web"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <code>grpc-web</code>
                    </a>
                  </td>
                  <td className="ack-desc">
                    Browser client for gRPC services.
                  </td>
                  <td className="ack-license">
                    <span className="ack-badge">Apache-2</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </dialog>
    </div>
  );
}
