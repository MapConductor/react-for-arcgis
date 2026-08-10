import {
  useState } from 'react';
import {
  MapCameraPosition as MapCameraPositionNS,
  MapViewState,
  createRandomId,
  type MapCameraPosition,
  type MapViewControllerInterface,
  type MapViewStateInterface,
} from '@mapconductor/js-sdk-core';
import {
  ArcGISDesign,
  type ArcGISDesignTypeInterface,
} from './ArcGISMapDesign';

export interface ArcGISMapViewStateInterface
  extends MapViewStateInterface<ArcGISDesignTypeInterface> {
  readonly apiKey: string;
}

export interface ArcGISMapViewStateParams {
  id?: string;
  apiKey?: string;
  mapDesignType?: ArcGISDesignTypeInterface;
  cameraPosition?: MapCameraPosition;
}

export class ArcGISMapViewState extends MapViewState<ArcGISDesignTypeInterface>
  implements ArcGISMapViewStateInterface {
  readonly apiKey: string;
  private _mapDesignType: ArcGISDesignTypeInterface;

  constructor({
    id = createRandomId(),
    apiKey = '',
    mapDesignType = ArcGISDesign.Streets,
    cameraPosition = MapCameraPositionNS.Default,
  }: ArcGISMapViewStateParams = {}) {
    super({ id, cameraPosition });
    this.apiKey = apiKey;
    this._mapDesignType = mapDesignType;
  }

  override get mapDesignType(): ArcGISDesignTypeInterface {
    return this._mapDesignType;
  }

  override set mapDesignType(value: ArcGISDesignTypeInterface) {
    this._mapDesignType = value;
    const controller = this.attachedMapController as { setMapDesignType?: (design: ArcGISDesignTypeInterface) => void } | null;
    controller?.setMapDesignType?.(value);
  }

  /** このプロバイダは接続時にカメラを動かさない（ビュー側が別経路で初期位置を当てる）。 */
  override setController(controller: MapViewControllerInterface | null): void {
    this.attachController(controller, false);
  }
}

export type ArcGISViewState = ArcGISMapViewState;
export type ArcGISViewStateOptions = ArcGISMapViewStateParams;

export function useArcGISViewState(params: ArcGISMapViewStateParams = {}): ArcGISMapViewStateInterface {
  const [state] = useState(() => new ArcGISMapViewState(params));
  return state;
}
