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
import Circle from '@arcgis/core/geometry/Circle';
import Point from '@arcgis/core/geometry/Point';

export class ArcGISCircleOverlayRenderer implements CircleOverlayRenderer<__esri.Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {}

  createCircle(entity: CircleEntity<__esri.Graphic>): __esri.Graphic | null {
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

  updateCircle(graphic: __esri.Graphic, entity: CircleEntity<__esri.Graphic>): void {
    const state = entity.state;
    graphic.geometry = this.createCircleGeometry(state);
    graphic.symbol = this.createCircleSymbol(state);
  }

  // A point geometry cannot carry a radius; build a Circle polygon so the
  // fill symbol has an area to render. Always geodesic: with a WGS84 center a
  // planar Circle would interpret radiusMeters in degrees, and a Web Mercator
  // center would distort it by 1/cos(lat) — geodesic is the only mode that
  // honours meters, matching the other providers.
  private createCircleGeometry(state: CircleState): __esri.Circle {
    return new Circle({
      center: new Point({
        longitude: state.center.longitude,
        latitude: state.center.latitude,
        spatialReference: { wkid: 4326 },
      }),
      radius: state.radiusMeters,
      radiusUnit: 'meters',
      geodesic: true,
    });
  }

  removeCircle(graphic: __esri.Graphic): void {
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

  private createCircleSymbol(state: CircleState): __esri.SimpleFillSymbol {
    const strokeColor = state.strokeColor ?? '#000000';
    const strokeWidth = (state.strokeWidth ?? 2) * CSS_PIXELS_TO_POINTS;
    const fillColor = state.fillColor ?? 'transparent';
    const fill = toArcGISFillStyle(fillColor);
    const stroke = toArcGISFillStyle(strokeColor);

    return {
      type: 'simple-fill',
      style: 'solid',
      color: [...fill.color, fill.opacity] as unknown as __esri.Color,
      outline: {
        type: 'simple-line',
        style: 'solid',
        color: [...stroke.color, stroke.opacity] as unknown as __esri.Color,
        width: strokeWidth,
      },
    } as __esri.SimpleFillSymbol;
  }
}
