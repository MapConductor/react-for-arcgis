import {
  PolylineController,
  PolylineManager,
  type PolylineState,
  type OnPolylineEventHandler,
} from '@mapconductor/js-sdk-core';
import { ArcGISPolylineOverlayRenderer } from './ArcGISPolylineOverlayRenderer';

export class ArcGISPolylineOverlayController extends PolylineController<__esri.Graphic> {
  declare readonly renderer: ArcGISPolylineOverlayRenderer;

  constructor(renderer: ArcGISPolylineOverlayRenderer) {
    super({
      polylineManager: new PolylineManager<__esri.Graphic>(),
      renderer,
    });
  }

  async composition(data: PolylineState[]): Promise<void> {
    await this.add(data);
  }

  has(state: PolylineState): boolean {
    return this.polylineManager.hasEntity(state.id);
  }

  setOnClickListener(listener: OnPolylineEventHandler | null): void {
    this.clickListener = listener;
  }
}
