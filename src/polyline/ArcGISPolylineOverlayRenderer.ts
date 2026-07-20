import {
  createInterpolatePoints,
  createLinearInterpolatePoints,
  PolylineEntity,
  type PolylineAddParams,
  type PolylineChangeParams,
  type PolylineState,
  type PolylineOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import { toArcGISFillStyle } from '../color';
import { CSS_PIXELS_TO_POINTS } from '../helpers';
import Graphic from '@arcgis/core/Graphic';

export class ArcGISPolylineOverlayRenderer implements PolylineOverlayRenderer<__esri.Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {}

  createPolyline(entity: PolylineEntity<__esri.Graphic>): __esri.Graphic | null {
    const state = entity.state;
    if (state.points.length < 2) return null;

    const lineSymbol = this.createLineSymbol(state);

    const graphic = new Graphic({
      geometry: this.createGeometry(state),
      symbol: lineSymbol,
      attributes: {
        id: state.id,
      },
    });

    this.graphicsLayer.add(graphic);
    return graphic;
  }

  updatePolyline(graphic: __esri.Graphic, entity: PolylineEntity<__esri.Graphic>): void {
    const state = entity.state;
    if (state.points.length < 2) return;

    graphic.geometry = this.createGeometry(state);

    const lineSymbol = this.createLineSymbol(state);
    graphic.symbol = lineSymbol;
  }

  removePolyline(graphic: __esri.Graphic): void {
    this.graphicsLayer.remove(graphic);
  }

  async onAdd(data: PolylineAddParams[]): Promise<(Graphic | null)[]> {
    return data.map(({ state }) => this.createPolyline({ state } as PolylineEntity<Graphic>));
  }

  async onChange(data: PolylineChangeParams<Graphic>[]): Promise<(Graphic | null)[]> {
    return data.map(({ current }) => {
      if (!current.polyline) return this.createPolyline(current);
      this.updatePolyline(current.polyline, current);
      return current.polyline;
    });
  }

  async onRemove(data: PolylineEntity<Graphic>[]): Promise<void> {
    data.forEach(({ polyline }) => this.removePolyline(polyline));
  }

  async onPostProcess(): Promise<void> {}

  private createGeometry(state: PolylineState): __esri.PolylineProperties & { type: 'polyline' } {
    const points = state.geodesic
      ? createInterpolatePoints(state.points)
      : createLinearInterpolatePoints(state.points);
    let previousLongitude = points[0].longitude;
    const path = points.map((point, index) => {
      let longitude = point.longitude;
      if (index > 0) {
        while (longitude - previousLongitude > 180) longitude -= 360;
        while (longitude - previousLongitude < -180) longitude += 360;
      }
      previousLongitude = longitude;
      return [longitude, point.latitude];
    });

    return {
      type: 'polyline',
      paths: [path],
      spatialReference: { wkid: 4326 },
    };
  }

  private createLineSymbol(state: PolylineState): __esri.SimpleLineSymbol {
    const width = state.strokeWidth * CSS_PIXELS_TO_POINTS;
    const pattern = 'solid';
    const stroke = toArcGISFillStyle(state.strokeColor);

    return {
      type: 'simple-line',
      style: this.lineStyleToArcGISStyle(pattern),
      color: [...stroke.color, stroke.opacity] as unknown as __esri.Color,
      width: width,
    } as __esri.SimpleLineSymbol;
  }

  private lineStyleToArcGISStyle(style: string): 'solid' | 'dash' | 'dot' | 'dash-dot' | 'long-dash' | 'long-dash-dot' | 'none' {
    switch (style.toLowerCase()) {
      case 'dash': return 'dash';
      case 'dot': return 'dot';
      case 'dashdot': return 'dash-dot';
      case 'longdash': return 'long-dash';
      case 'longdashdot': return 'long-dash-dot';
      case 'null': return 'none';
      default: return 'solid';
    }
  }
}
