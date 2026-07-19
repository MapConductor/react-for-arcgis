import { useState } from 'react';
import {
  MapCameraPosition as MapCameraPositionNS,
  MapViewState,
  createRandomId,
  type GeoPoint,
  type MapCameraPosition,
  type MapViewControllerInterface,
  type MapViewHolder,
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
  readonly id: string;
  readonly apiKey: string;
  private _cameraPosition: MapCameraPosition;
  private _mapDesignType: ArcGISDesignTypeInterface;
  private controller: MapViewControllerInterface | null = null;
  private cameraPositionChangeListener: ((camera: MapCameraPosition) => void) | null = null;

  constructor({
    id = createRandomId(),
    apiKey = '',
    mapDesignType = ArcGISDesign.Streets,
    cameraPosition = MapCameraPositionNS.Default,
  }: ArcGISMapViewStateParams = {}) {
    super();
    this.id = id;
    this.apiKey = apiKey;
    this._mapDesignType = mapDesignType;
    this._cameraPosition = cameraPosition;
  }

  override get cameraPosition(): MapCameraPosition {
    return this._cameraPosition;
  }

  override get mapDesignType(): ArcGISDesignTypeInterface {
    return this._mapDesignType;
  }

  override set mapDesignType(value: ArcGISDesignTypeInterface) {
    this._mapDesignType = value;
    const controller = this.controller as { setMapDesignType?: (design: ArcGISDesignTypeInterface) => void } | null;
    controller?.setMapDesignType?.(value);
  }

  override moveCameraTo(position: GeoPoint, durationMillis?: number): void;
  override moveCameraTo(cameraPosition: MapCameraPosition, durationMillis?: number): void;
  override moveCameraTo(positionOrCamera: GeoPoint | MapCameraPosition, durationMillis?: number): void {
    const next = 'zoom' in positionOrCamera
      ? positionOrCamera
      : this._cameraPosition.copy({ position: positionOrCamera });
    if (!this.controller) {
      this._cameraPosition = next;
      return;
    }
    if (!durationMillis || durationMillis === 0) {
      void this.controller.moveCamera(next);
    } else {
      void this.controller.animateCamera(next, { duration: durationMillis });
    }
    this._cameraPosition = next;
    this.cameraPositionChangeListener?.(next);
  }

  override getMapViewHolder(): MapViewHolder<unknown, unknown> | null {
    return this.controller?.holder ?? null;
  }

  override setController(controller: MapViewControllerInterface | null): void {
    this.controller = controller;
  }

  override updateCameraPosition(camera: MapCameraPosition): void {
    this._cameraPosition = camera;
    this.cameraPositionChangeListener?.(camera);
  }

  override setCameraPositionChangeListener(listener: ((camera: MapCameraPosition) => void) | null): void {
    this.cameraPositionChangeListener = listener;
  }
}

export type ArcGISViewState = ArcGISMapViewState;
export type ArcGISViewStateOptions = ArcGISMapViewStateParams;

export function useArcGISViewState(params: ArcGISMapViewStateParams = {}): ArcGISMapViewState {
  const [state] = useState(() => new ArcGISMapViewState(params));
  return state;
}
