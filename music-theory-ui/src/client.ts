import { MusicTheoryServiceClient } from "./gen/MusictheoryServiceClientPb";
import { ChordImageServiceClient } from "./gen/ChordimageServiceClientPb";

// Envoy is on port 8080 with grpc-web filter
const ENVOY_URL = "http://localhost:8080";

export const musicTheoryClient = new MusicTheoryServiceClient(ENVOY_URL);
export const chordImageClient = new ChordImageServiceClient(ENVOY_URL);
