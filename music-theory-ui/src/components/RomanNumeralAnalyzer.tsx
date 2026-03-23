import React, { useState, useCallback } from "react";
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

      setChordSvg(scaleSvg(svgRes, 2));
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [romanNumeral, key]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") analyze();
  };

  return (
    <div className="analyzer">
      <h1>Roman Numeral Analyzer</h1>
      <p className="subtitle">
        Analyze chords, inversions, and figured bass in any key.
      </p>

      <div className="input-row">
        <div className="field">
          <label htmlFor="roman">Roman Numeral</label>
          <input
            id="roman"
            type="text"
            value={romanNumeral}
            onChange={(e) => setRomanNumeral(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. V, viio, IV6, bII"
            autoFocus
          />
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
    </div>
  );
}
