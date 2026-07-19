import {
  PolygonController,
  PolygonManager,
  type PolygonState,
  type OnPolygonEventHandler,
} from '@mapconductor/js-sdk-core';
import { ArcGISPolygonOverlayRenderer } from './ArcGISPolygonOverlayRenderer';

export class ArcGISPolygonOverlayController extends PolygonController<__esri.Graphic> {
  declare readonly renderer: ArcGISPolygonOverlayRenderer;

  constructor(renderer: ArcGISPolygonOverlayRenderer) {
    super({
      polygonManager: new PolygonManager<__esri.Graphic>(),
      renderer,
    });
  }

  async composition(data: PolygonState[]): Promise<void> {
    await this.add(data);
  }

  has(state: PolygonState): boolean {
    return this.polygonManager.hasEntity(state.id);
  }

  setOnClickListener(listener: OnPolygonEventHandler | null): void {
    this.clickListener = listener;
  }
}
