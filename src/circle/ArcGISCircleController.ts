import {
  CircleController,
  CircleManager,
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

  // Click handling is done at the view level
}
