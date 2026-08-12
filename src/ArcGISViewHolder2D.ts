import {
  MapViewHolderBase,
  createGeoPoint,
  type GeoPoint,
  type GeoPointInterface,
  type Offset,
} from '@mapconductor/js-sdk-core';
import type Point from "@arcgis/core/geometry/Point";
import type MapView from "@arcgis/core/views/MapView";

export class ArcGISViewHolder2D extends MapViewHolderBase<HTMLDivElement, MapView> {
  constructor(
    readonly mapView: HTMLDivElement,
    readonly map: MapView,
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

      const screenPoint = this.map.toScreen(point as Point);
      if (!screenPoint) return null;

      return {
        x: screenPoint.x,
        y: screenPoint.y,
      };
    } catch {
      return null;
    }
  }

  fromScreenOffsetSync(offset: Offset): GeoPoint | null {
    try {
      const screenPoint = {
        x: offset.x,
        y: offset.y,
      };

      const point = this.map.toMap(screenPoint) as Point;
      if (!point) return null;

      return createGeoPoint({
        latitude: point.latitude ?? 0,
        longitude: point.longitude ?? 0,
        altitude: point.z ?? undefined,
      });
    } catch {
      return null;
    }
  }
}
