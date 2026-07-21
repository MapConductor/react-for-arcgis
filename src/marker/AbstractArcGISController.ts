import {
  AbstractMarkerController,
  MarkerManager,
  MarkerTilingOptions,
  type MarkerEntity,
  type MarkerState,
} from '@mapconductor/js-sdk-core';
import { ArcGISActualMarker } from '../ArcGISTypeAlias';
import { ArcGISMarkerRendererInterface } from './ArcGISMarkerRendererInterface';

export abstract class AbstractArcGISController<
  ActualMarker = ArcGISActualMarker,
  Renderer extends ArcGISMarkerRendererInterface<ActualMarker> = ArcGISMarkerRendererInterface<ActualMarker>,
> extends AbstractMarkerController<ActualMarker> {
  declare readonly renderer: Renderer;

  constructor(
    renderer: Renderer,
    _tilingOptions: MarkerTilingOptions = MarkerTilingOptions.Default,
  ) {
    super({
      markerManager: MarkerManager.defaultManager<ActualMarker>(
        null,
        _tilingOptions.minMarkerCount,
      ),
      renderer,
    });
  }

  protected override onMarkerAdded(entity: MarkerEntity<ActualMarker>): void {
    if (entity.marker) {
      this.attachListeners(entity.marker, entity.state);
    }
  }

  protected abstract attachListeners(marker: ActualMarker, state: MarkerState): void;
}
