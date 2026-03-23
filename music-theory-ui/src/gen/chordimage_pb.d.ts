import * as jspb from 'google-protobuf'



export class RenderRomanNumeralRequest extends jspb.Message {
  getRomanNumeral(): string;
  setRomanNumeral(value: string): RenderRomanNumeralRequest;

  getKey(): string;
  setKey(value: string): RenderRomanNumeralRequest;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RenderRomanNumeralRequest.AsObject;
  static toObject(includeInstance: boolean, msg: RenderRomanNumeralRequest): RenderRomanNumeralRequest.AsObject;
  static serializeBinaryToWriter(message: RenderRomanNumeralRequest, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RenderRomanNumeralRequest;
  static deserializeBinaryFromReader(message: RenderRomanNumeralRequest, reader: jspb.BinaryReader): RenderRomanNumeralRequest;
}

export namespace RenderRomanNumeralRequest {
  export type AsObject = {
    romanNumeral: string;
    key: string;
  };
}

export class RenderRomanNumeralResponse extends jspb.Message {
  getPngBase64(): string;
  setPngBase64(value: string): RenderRomanNumeralResponse;

  getError(): string;
  setError(value: string): RenderRomanNumeralResponse;

  serializeBinary(): Uint8Array;
  toObject(includeInstance?: boolean): RenderRomanNumeralResponse.AsObject;
  static toObject(includeInstance: boolean, msg: RenderRomanNumeralResponse): RenderRomanNumeralResponse.AsObject;
  static serializeBinaryToWriter(message: RenderRomanNumeralResponse, writer: jspb.BinaryWriter): void;
  static deserializeBinary(bytes: Uint8Array): RenderRomanNumeralResponse;
  static deserializeBinaryFromReader(message: RenderRomanNumeralResponse, reader: jspb.BinaryReader): RenderRomanNumeralResponse;
}

export namespace RenderRomanNumeralResponse {
  export type AsObject = {
    pngBase64: string;
    error: string;
  };
}

