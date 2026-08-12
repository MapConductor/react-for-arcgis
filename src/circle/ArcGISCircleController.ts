import {
  CircleController,
  CircleManager,
} from '@mapconductor/js-sdk-core';
import { ArcGISCircleOverlayRenderer } from './ArcGISCircleOverlayRenderer';
import type Graphic from "@arcgis/core/Graphic";

export class ArcGISCircleOverlayController extends CircleController<Graphic> {
  declare readonly renderer: ArcGISCircleOverlayRenderer;

  constructor(renderer: ArcGISCircleOverlayRenderer) {
    super({
      circleManager: new CircleManager<Graphic>(),
      renderer,
    });
  }

  // Click handling is done at the view level
}
