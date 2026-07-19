import { MarkerTilingOptions, type MarkerState } from '@mapconductor/js-sdk-core';
import { ArcGISMarkerRenderer } from './ArcGISMarkerRenderer';
import { AbstractArcGISController } from './AbstractArcGISController';

export class ArcGISMarkerController extends AbstractArcGISController<__esri.Graphic, ArcGISMarkerRenderer> {
  constructor(
    renderer: ArcGISMarkerRenderer,
    tilingOptions: MarkerTilingOptions = MarkerTilingOptions.Default,
  ) {
    super(renderer, tilingOptions);
  }

  protected attachListeners(_marker: __esri.Graphic, _state: MarkerState): void {
    // ArcGIS handles events through the view's click handlers
    // This is handled in the view controller
  }
}
