import {
  MapViewHolderBase,
  createGeoPoint,
  type GeoPoint,
  type GeoPointInterface,
  type Offset,
} from '@mapconductor/js-sdk-core';

export class ArcGISViewHolder2D extends MapViewHolderBase<HTMLDivElement, __esri.MapView> {
  constructor(
    readonly mapView: HTMLDivElement,
    readonly map: __esri.MapView,
  ) {
    super();
  }

  toScreenOffset(position: GeoPointInterface): Offset | null {
    try {
      const point = {
        type: 'point',
        longitude: position.longitude,
        latitude: position.latitude,
        spatialReference: { wkid: 4326 },
      };

      const screenPoint = this.map.toScreen(point as __esri.Point);
      if (!screenPoint) return null;

      return {
        x: screenPoint.x,
        y: screenPoint.y,
      };
    } catch (e) {
      return null;
    }
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint | null {
    try {
      const screenPoint = {
        x: offset.x,
        y: offset.y,
      };

      const point = this.map.toMap(screenPoint) as __esri.Point;
      if (!point) return null;

      return createGeoPoint({
        latitude: point.latitude ?? 0,
        longitude: point.longitude ?? 0,
        altitude: point.z ?? undefined,
      });
    } catch (e) {
      return null;
    }
  }
}
