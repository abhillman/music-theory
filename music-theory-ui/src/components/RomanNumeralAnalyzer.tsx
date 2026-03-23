import React, { useState, useCallback, useEffect, useRef } from "react";
import { musicTheoryClient, chordImageClient } from "../client";
import { RomanNumeralRequest } from "../gen/musictheory_pb";
import { RenderRomanNumeralRequest } from "../gen/chordimage_pb";
import "./RomanNumeralAnalyzer.css";

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

export default function RomanNumeralAnalyzer() {
  const [romanNumeral, setRomanNumeral] = useState("V");
  const [key, setKey] = useState("C");
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [chordSvg, setChordSvg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showAcknowledgements, setShowAcknowledgements] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

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

  return (
    <div className="analyzer">
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
              {analysis.rootPitch} {analysis.commonName}
            </span>
          </div>

          {/* ── Detail Table ─────────────────────────────────────── */}
          <table className="detail-table">
            <tbody>
              <tr>
                <th>Pitches</th>
                <td>{analysis.pitchNames.join(" – ")}</td>
              </tr>
              <tr>
                <th>Root</th>
                <td>{analysis.rootPitch}</td>
              </tr>
              <tr>
                <th>Bass</th>
                <td>{analysis.bassPitch}</td>
              </tr>
              <tr>
                <th>Quality</th>
                <td>{analysis.quality}</td>
              </tr>
              <tr>
                <th>Inversion</th>
                <td>
                  {analysis.inversionText}
                  {analysis.figuredBassString &&
                    ` (${analysis.figuredBassString})`}
                </td>
              </tr>
              <tr>
                <th>Scale Degree</th>
                <td>
                  {analysis.scaleDegree} — {analysis.scaleDegreeName}
                </td>
              </tr>
              <tr>
                <th>Pitch Classes</th>
                <td>[{analysis.pitchClasses.join(", ")}]</td>
              </tr>
              <tr>
                <th>Forte Class</th>
                <td>{analysis.forteClass || "—"}</td>
              </tr>
              <tr>
                <th>LilyPond</th>
                <td>
                  <code>{analysis.lilypondChord}</code>
                </td>
              </tr>

              {/* Boolean flags — only show truthy ones */}
              {(analysis.isMajorTriad ||
                analysis.isMinorTriad ||
                analysis.isDominantSeventh ||
                analysis.isDiminishedSeventh ||
                analysis.isAugmentedSixth) && (
                <tr>
                  <th>Flags</th>
                  <td className="flags">
                    {analysis.isMajorTriad && (
                      <span className="flag">Major Triad</span>
                    )}
                    {analysis.isMinorTriad && (
                      <span className="flag">Minor Triad</span>
                    )}
                    {analysis.isDominantSeventh && (
                      <span className="flag">Dominant 7th</span>
                    )}
                    {analysis.isDiminishedSeventh && (
                      <span className="flag">Diminished 7th</span>
                    )}
                    {analysis.isAugmentedSixth && (
                      <span className="flag">Augmented 6th</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
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
