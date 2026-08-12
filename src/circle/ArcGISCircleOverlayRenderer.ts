import {
  CircleEntity,
  type CircleAddParams,
  type CircleChangeParams,
  type CircleState,
  type CircleOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import { toArcGISFillStyle } from '../color';
import { CSS_PIXELS_TO_POINTS } from '../helpers';
import Graphic from '@arcgis/core/Graphic';
import Point from '@arcgis/core/geometry/Point';
import * as geometryEngine from '@arcgis/core/geometry/geometryEngine';
import { geographicToWebMercator } from '@arcgis/core/geometry/support/webMercatorUtils';
import type SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import type Color from "@arcgis/core/Color";
import type Polygon from "@arcgis/core/geometry/Polygon";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

export class ArcGISCircleOverlayRenderer implements CircleOverlayRenderer<Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: GraphicsLayer,
  ) {}

  createCircle(entity: CircleEntity<Graphic>): Graphic | null {
    const state = entity.state;

    const graphic = new Graphic({
      geometry: this.createCircleGeometry(state),
      symbol: this.createCircleSymbol(state),
      attributes: {
        id: state.id,
      },
    });

    this.graphicsLayer.add(graphic);
    return graphic;
  }

  updateCircle(graphic: Graphic, entity: CircleEntity<Graphic>): void {
    const state = entity.state;
    graphic.geometry = this.createCircleGeometry(state);
    graphic.symbol = this.createCircleSymbol(state);
  }

  // A point geometry cannot carry a radius; build a buffer polygon so the fill
  // symbol has an area to render. Uses GeometryEngine.geodesicBuffer / buffer
  // (Android parity: GeometryEngine.bufferGeodetic / buffer) rather than the
  // Circle convenience class. The Circle class emits a raw ring that ArcGIS does
  // not normalize across the antimeridian, so a large circle whose ring crosses
  // ±180° (e.g. an Oahu-centered circle extending west past 180°) has its
  // western half dropped. geodesicBuffer returns a properly normalized polygon
  // (split at the antimeridian when needed), so the whole ring renders.
  // Geodesic keeps the WGS84 center (meters on the ellipsoid). Planar needs a
  // genuinely projected center — around a WGS84 center a planar buffer would
  // interpret radiusMeters in degrees — so the center is projected to Web
  // Mercator and the radius is applied in that projection's meters, mirroring
  // Android's planar GeometryEngine.buffer in the map's spatial reference.
  private createCircleGeometry(state: CircleState): Polygon | null {
    const center = new Point({
      longitude: state.center.longitude,
      latitude: state.center.latitude,
      spatialReference: { wkid: 4326 },
    });
    if (state.geodesic) {
      return geometryEngine.geodesicBuffer(center, state.radiusMeters, 'meters') as Polygon | null;
    }
    const projected = (geographicToWebMercator(center) as Point | null) ?? center;
    return geometryEngine.buffer(projected, state.radiusMeters, 'meters') as Polygon | null;
  }

  removeCircle(graphic: Graphic): void {
    this.graphicsLayer.remove(graphic);
  }

  async onAdd(data: CircleAddParams[]): Promise<(Graphic | null)[]> {
    return data.map(({ state }) => this.createCircle({ state } as CircleEntity<Graphic>));
  }

  async onChange(data: CircleChangeParams<Graphic>[]): Promise<(Graphic | null)[]> {
    return data.map(({ current }) => {
      if (!current.circle) return this.createCircle(current);
      this.updateCircle(current.circle, current);
      return current.circle;
    });
  }

  async onRemove(data: CircleEntity<Graphic>[]): Promise<void> {
    data.forEach(({ circle }) => { if (circle) this.removeCircle(circle); });
  }

  async onPostProcess(): Promise<void> {}

  private createCircleSymbol(state: CircleState): SimpleFillSymbol {
    const strokeColor = state.strokeColor ?? '#000000';
    const strokeWidth = (state.strokeWidth ?? 2) * CSS_PIXELS_TO_POINTS;
    const fillColor = state.fillColor ?? 'transparent';
    const fill = toArcGISFillStyle(fillColor);
    const stroke = toArcGISFillStyle(strokeColor);

    return {
      type: 'simple-fill',
      style: 'solid',
      color: [...fill.color, fill.opacity] as unknown as Color,
      outline: {
        type: 'simple-line',
        style: 'solid',
        color: [...stroke.color, stroke.opacity] as unknown as Color,
        width: strokeWidth,
      },
    } as SimpleFillSymbol;
  }
}
