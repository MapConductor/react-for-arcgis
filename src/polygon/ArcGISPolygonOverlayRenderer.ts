import {
  PolygonEntity,
  type PolygonAddParams,
  type PolygonChangeParams,
  type PolygonState,
  type PolygonOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import { toArcGISFillStyle } from '../color';
import Graphic from '@arcgis/core/Graphic';

export class ArcGISPolygonOverlayRenderer implements PolygonOverlayRenderer<__esri.Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {}

  createPolygon(entity: PolygonEntity<__esri.Graphic>): __esri.Graphic | null {
    const state = entity.state;
    const points = state.points;
    if (!points || points.length < 3) return null;

    const polygon = {
      type: 'polygon' as const,
      rings: [points.map(p => [p.longitude, p.latitude])],
      spatialReference: { wkid: 4326 },
    };

    const fillSymbol = this.createFillSymbol(state);

    const graphic = new Graphic({
      geometry: polygon as unknown as __esri.PolygonProperties & { type: 'polygon' },
      symbol: fillSymbol,
      attributes: {
        id: state.id,
      },
    });

    this.graphicsLayer.add(graphic);
    return graphic;
  }

  updatePolygon(graphic: __esri.Graphic, entity: PolygonEntity<__esri.Graphic>): void {
    const state = entity.state;
    const points = state.points;
    if (!points || points.length < 3) return;

    graphic.geometry = {
      type: 'polygon' as const,
      rings: [points.map(p => [p.longitude, p.latitude])],
      spatialReference: { wkid: 4326 },
    };

    const fillSymbol = this.createFillSymbol(state);
    graphic.symbol = fillSymbol;
  }

  removePolygon(graphic: __esri.Graphic): void {
    this.graphicsLayer.remove(graphic);
  }

  async onAdd(data: PolygonAddParams[]): Promise<(Graphic | null)[]> {
    return data.map(({ state }) => this.createPolygon({ state } as PolygonEntity<Graphic>));
  }

  async onChange(data: PolygonChangeParams<Graphic>[]): Promise<(Graphic | null)[]> {
    return data.map(({ current }) => {
      if (!current.polygon) return this.createPolygon(current);
      this.updatePolygon(current.polygon, current);
      return current.polygon;
    });
  }

  async onRemove(data: PolygonEntity<Graphic>[]): Promise<void> {
    data.forEach(({ polygon }) => this.removePolygon(polygon));
  }

  async onPostProcess(): Promise<void> {}

  private createFillSymbol(state: PolygonState): __esri.SimpleFillSymbol {
    const strokeColor = state.strokeColor ?? '#000000';
    const strokeWidth = state.strokeWidth ?? 2;
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
