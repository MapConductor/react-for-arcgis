import {
  buildUnwrappedPolylinePath,
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
import type SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import type Color from "@arcgis/core/Color";
import type { PolylineProperties } from "@arcgis/core/geometry/Polyline";
import type GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";

export class ArcGISPolylineOverlayRenderer implements PolylineOverlayRenderer<Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: GraphicsLayer,
  ) {}

  createPolyline(entity: PolylineEntity<Graphic>): Graphic | null {
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

  updatePolyline(graphic: Graphic, entity: PolylineEntity<Graphic>): void {
    const state = entity.state;
    if (state.points.length < 2) return;

    graphic.geometry = this.createGeometry(state);

    const lineSymbol = this.createLineSymbol(state);
    graphic.symbol = lineSymbol;
  }

  removePolyline(graphic: Graphic): void {
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

  private createGeometry(state: PolylineState): PolylineProperties & { type: 'polyline' } {
    // Core pipeline: densification + longitude unwrap (ArcGIS accepts unwrapped
    // longitudes, keeping antimeridian-crossing segments continuous).
    const path = buildUnwrappedPolylinePath(state.points, state.geodesic)
      .map(point => [point.longitude, point.latitude]);

    return {
      type: 'polyline',
      paths: [path],
      spatialReference: { wkid: 4326 },
    };
  }

  private createLineSymbol(state: PolylineState): SimpleLineSymbol {
    const width = state.strokeWidth * CSS_PIXELS_TO_POINTS;
    const pattern = 'solid';
    const stroke = toArcGISFillStyle(state.strokeColor);

    return {
      type: 'simple-line',
      style: this.lineStyleToArcGISStyle(pattern),
      color: [...stroke.color, stroke.opacity] as unknown as Color,
      width: width,
    } as SimpleLineSymbol;
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
