import {
  CircleController,
  CircleManager,
  type CircleState,
  type OnCircleEventHandler,
} from '@mapconductor/js-sdk-core';
import { ArcGISCircleOverlayRenderer } from './ArcGISCircleOverlayRenderer';

export class ArcGISCircleOverlayController extends CircleController<__esri.Graphic> {
  declare readonly renderer: ArcGISCircleOverlayRenderer;

  constructor(renderer: ArcGISCircleOverlayRenderer) {
    super({
      circleManager: new CircleManager<__esri.Graphic>(),
      renderer,
    });
  }

  async composition(data: CircleState[]): Promise<void> {
    await this.add(data);
  }

  has(state: CircleState): boolean {
    return this.circleManager.hasEntity(state.id);
  }

  setOnClickListener(listener: OnCircleEventHandler | null): void {
    this.clickListener = listener;
  }

  // Click handling is done at the view level
}
