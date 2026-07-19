import { createGeoPoint, createGeoRectBounds, type GeoPoint, type GeoRectBounds } from '@mapconductor/js-sdk-core';

export function geoPointToPoint(point: GeoPoint): { x: number; y: number; z?: number } {
  return {
    x: point.longitude,
    y: point.latitude,
    z: point.altitude || 0,
  };
}

export function pointToGeoPoint(point: { x: number; y: number; z?: number }): GeoPoint {
  return createGeoPoint({
    latitude: point.y,
    longitude: point.x,
    altitude: point.z,
  });
}

export function geoRectToExtent(bounds: GeoRectBounds): { xmin: number; ymin: number; xmax: number; ymax: number; spatialReference: { wkid: number } } | null {
  if (!bounds.southWest || !bounds.northEast) return null;
  return {
    xmin: bounds.southWest.longitude,
    ymin: bounds.southWest.latitude,
    xmax: bounds.northEast.longitude,
    ymax: bounds.northEast.latitude,
    spatialReference: { wkid: 4326 },
  };
}

export function extentToGeoRect(extent: { xmin: number; ymin: number; xmax: number; ymax: number }): GeoRectBounds {
  const bounds = createGeoRectBounds();
  bounds.extend(createGeoPoint({
    latitude: extent.ymin,
    longitude: extent.xmin,
  }));
  bounds.extend(createGeoPoint({
    latitude: extent.ymax,
    longitude: extent.xmax,
  }));
  return bounds;
}
