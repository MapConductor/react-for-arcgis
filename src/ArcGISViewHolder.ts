import {
  MapViewHolderBase,
  createGeoPoint,
  type GeoPoint,
  type GeoPointInterface,
  type Offset,
} from '@mapconductor/js-sdk-core';
import { ZoomAltitudeConverter } from './zoom';

export class ArcGISViewHolder extends MapViewHolderBase<HTMLElement, __esri.SceneView | __esri.MapView> {
  constructor(
    readonly mapView: HTMLElement,
    readonly map: __esri.SceneView | __esri.MapView,
    readonly zoomConverter: ZoomAltitudeConverter,
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

  async fromScreenOffset(offset: Offset): Promise<GeoPoint | null> {
    return this.fromScreenOffsetSync(offset);
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
