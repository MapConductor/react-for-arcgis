import {
  CircleEntity,
  type CircleAddParams,
  type CircleChangeParams,
  type CircleState,
  type CircleOverlayRenderer,
} from '@mapconductor/js-sdk-core';
import { ArcGISViewHolder } from '../ArcGISViewHolder';
import { toArcGISFillStyle } from '../color';
import Graphic from '@arcgis/core/Graphic';

export class ArcGISCircleOverlayRenderer implements CircleOverlayRenderer<__esri.Graphic> {
  constructor(
    readonly holder: ArcGISViewHolder,
    private graphicsLayer: __esri.GraphicsLayer,
  ) {}

  createCircle(entity: CircleEntity<__esri.Graphic>): __esri.Graphic | null {
    const state = entity.state;
    const position = state.center;

    const point = {
      type: 'point' as const,
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    };

    const circleSymbol = this.createCircleSymbol(state);

    const graphic = new Graphic({
      geometry: point as __esri.PointProperties & { type: 'point' },
      symbol: circleSymbol,
      attributes: {
        id: state.id,
      },
    });

    this.graphicsLayer.add(graphic);
    return graphic;
  }

  updateCircle(graphic: __esri.Graphic, entity: CircleEntity<__esri.Graphic>): void {
    const state = entity.state;
    const position = state.center;

    graphic.geometry = {
      type: 'point' as const,
      longitude: position.longitude,
      latitude: position.latitude,
      spatialReference: { wkid: 4326 },
    };

    const circleSymbol = this.createCircleSymbol(state);
    graphic.symbol = circleSymbol;
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
