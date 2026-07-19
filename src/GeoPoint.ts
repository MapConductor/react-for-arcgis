import { GeoPointInterface } from "@mapconductor/js-sdk-core";

export function geoPointToPosition(position: GeoPointInterface | null): { x: number; y: number; z?: number } | null {
  if (!position) {
    return null;
  }
  return {
    x: position.longitude,
    y: position.latitude,
    z: position.altitude || 0,
  };
}

export function positionToGeoPoint(position: { x: number; y: number; z?: number } | null): GeoPointInterface | null {
  if (!position) {
    return null;
  }
  return {
    latitude: position.y,
    longitude: position.x,
    altitude: position.z,
  };
}