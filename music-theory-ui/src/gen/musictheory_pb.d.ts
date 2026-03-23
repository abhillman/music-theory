import * as jspb from 'google-protobuf'



export class RomanNumeralRequest extends jspb.Message {
  getRomanNumeral(): string;
  setRomanNumeral(value: string): RomanNumeralRequest;

  getKey(): string;
  setKey(value: string): RomanNumeralRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RomanNumeralRequest.AsObject;
  static toObject(includeInstance: boolean, msg: RomanNumeralRequest): RomanNumeralRequest.AsObject;
  static serializeBinaryToWriter(message: RomanNumeralRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RomanNumeralRequest;
  static deserializeBinaryFromReader(message: RomanNumeralRequest, reader: jspb.BinaryReader): RomanNumeralRequest;
}

export namespace RomanNumeralRequest {
  export type AsObject = {
    romanNumeral: string;
    key: string;
  };
}

export class RomanNumeralResponse extends jspb.Message {
  getInputRomanNumeral(): string;
  setInputRomanNumeral(value: string): RomanNumeralResponse;

  getKey(): string;
  setKey(value: string): RomanNumeralResponse;

  getInversionText(): string;
  setInversionText(value: string): RomanNumeralResponse;

  getInversionNumber(): number;
  setInversionNumber(value: number): RomanNumeralResponse;

  getCommonName(): string;
  setCommonName(value: string): RomanNumeralResponse;

  getFiguredBassNumbersList(): Array<number>;
  setFiguredBassNumbersList(value: Array<number>): RomanNumeralResponse;
  clearFiguredBassNumbersList(): RomanNumeralResponse;
  addFiguredBassNumbers(value: number, index?: number): RomanNumeralResponse;

  getFiguredBassString(): string;
  setFiguredBassString(value: string): RomanNumeralResponse;

  getPitchNamesList(): Array<string>;
  setPitchNamesList(value: Array<string>): RomanNumeralResponse;
  clearPitchNamesList(): RomanNumeralResponse;
  addPitchNames(value: string, index?: number): RomanNumeralResponse;

  getBassPitch(): string;
  setBassPitch(value: string): RomanNumeralResponse;

  getRootPitch(): string;
  setRootPitch(value: string): RomanNumeralResponse;

  getQuality(): string;
  setQuality(value: string): RomanNumeralResponse;

  getIsMajorTriad(): boolean;
  setIsMajorTriad(value: boolean): RomanNumeralResponse;

  getIsMinorTriad(): boolean;
  setIsMinorTriad(value: boolean): RomanNumeralResponse;

  getIsDominantSeventh(): boolean;
  setIsDominantSeventh(value: boolean): RomanNumeralResponse;

  getIsDiminishedSeventh(): boolean;
  setIsDiminishedSeventh(value: boolean): RomanNumeralResponse;

  getIsAugmentedSixth(): boolean;
  setIsAugmentedSixth(value: boolean): RomanNumeralResponse;

  getScaleDegree(): number;
  setScaleDegree(value: number): RomanNumeralResponse;

  getScaleDegreeName(): string;
  setScaleDegreeName(value: string): RomanNumeralResponse;

  getPitchClassesList(): Array<number>;
  setPitchClassesList(value: Array<number>): RomanNumeralResponse;
  clearPitchClassesList(): RomanNumeralResponse;
  addPitchClasses(value: number, index?: number): RomanNumeralResponse;

  getForteClass(): string;
  setForteClass(value: string): RomanNumeralResponse;

  getLilypondChord(): string;
  setLilypondChord(value: string): RomanNumeralResponse;

  getLilypondKey(): string;
  setLilypondKey(value: string): RomanNumeralResponse;

  getIntervalsFromBassList(): Array<string>;
  setIntervalsFromBassList(value: Array<string>): RomanNumeralResponse;
  clearIntervalsFromBassList(): RomanNumeralResponse;
  addIntervalsFromBass(value: string, index?: number): RomanNumeralResponse;

  getPitchedCommonName(): string;
  setPitchedCommonName(value: string): RomanNumeralResponse;

  getPrimeFormList(): Array<number>;
  setPrimeFormList(value: Array<number>): RomanNumeralResponse;
  clearPrimeFormList(): RomanNumeralResponse;
  addPrimeForm(value: number, index?: number): RomanNumeralResponse;

  getIntervalVectorList(): Array<number>;
  setIntervalVectorList(value: Array<number>): RomanNumeralResponse;
  clearIntervalVectorList(): RomanNumeralResponse;
  addIntervalVector(value: number, index?: number): RomanNumeralResponse;

  getFigureAndKey(): string;
  setFigureAndKey(value: string): RomanNumeralResponse;

  getFunctionalityScore(): number;
  setFunctionalityScore(value: number): RomanNumeralResponse;

  getIsNeapolitan(): boolean;
  setIsNeapolitan(value: boolean): RomanNumeralResponse;

  getIsHalfDiminishedSeventh(): boolean;
  setIsHalfDiminishedSeventh(value: boolean): RomanNumeralResponse;

  getIsAugmentedTriad(): boolean;
  setIsAugmentedTriad(value: boolean): RomanNumeralResponse;

  getIsDiminishedTriad(): boolean;
  setIsDiminishedTriad(value: boolean): RomanNumeralResponse;

  getIsConsonant(): boolean;
  setIsConsonant(value: boolean): RomanNumeralResponse;

  getIsTriad(): boolean;
  setIsTriad(value: boolean): RomanNumeralResponse;

  getIsSeventh(): boolean;
  setIsSeventh(value: boolean): RomanNumeralResponse;

  getImpliedQuality(): string;
  setImpliedQuality(value: string): RomanNumeralResponse;

  getSemitonesFromRootList(): Array<number>;
  setSemitonesFromRootList(value: Array<number>): RomanNumeralResponse;
  clearSemitonesFromRootList(): RomanNumeralResponse;
  addSemitonesFromRoot(value: number, index?: number): RomanNumeralResponse;

  getThirdPitch(): string;
  setThirdPitch(value: string): RomanNumeralResponse;

  getFifthPitch(): string;
  setFifthPitch(value: string): RomanNumeralResponse;

  getSeventhPitch(): string;
  setSeventhPitch(value: string): RomanNumeralResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RomanNumeralResponse.AsObject;
  static toObject(includeInstance: boolean, msg: RomanNumeralResponse): RomanNumeralResponse.AsObject;
  static serializeBinaryToWriter(message: RomanNumeralResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RomanNumeralResponse;
  static deserializeBinaryFromReader(message: RomanNumeralResponse, reader: jspb.BinaryReader): RomanNumeralResponse;
}

export namespace RomanNumeralResponse {
  export type AsObject = {
    inputRomanNumeral: string;
    key: string;
    inversionText: string;
    inversionNumber: number;
    commonName: string;
    figuredBassNumbersList: Array<number>;
    figuredBassString: string;
    pitchNamesList: Array<string>;
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
    pitchClassesList: Array<number>;
    forteClass: string;
    lilypondChord: string;
    lilypondKey: string;
    intervalsFromBassList: Array<string>;
    pitchedCommonName: string;
    primeFormList: Array<number>;
    intervalVectorList: Array<number>;
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
    semitonesFromRootList: Array<number>;
    thirdPitch: string;
    fifthPitch: string;
    seventhPitch: string;
  };
}

