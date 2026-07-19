import {
  BaseMapViewController,
  createGeoPoint,
  createMapCameraPosition,
  type CameraOptions,
  type CircleCapable,
  type CircleState,
  type GeoRectBounds,
  type GroundImageCapable,
  type GroundImageState,
  type MapCameraPosition,
  type MarkerAnimationOverlayHost,
  type OnMapInitializedHandler,
  type MapViewControllerInterface,
  type MarkerCapable,
  type MarkerState,
  type OnMarkerEventHandler,
  type OnCircleEventHandler,
  type OnGroundImageEventHandler,
  type OnPolygonEventHandler,
  type OnPolylineEventHandler,
  type PolygonCapable,
  type PolygonState,
  type PolylineCapable,
  type PolylineState,
  type RasterLayerCapable,
  type RasterLayerState,
  createGeoRectBounds,
  type VisibleRegion,
  type CircleEvent,
  type PolygonEvent,
  type PolylineEvent,
  type GroundImageEvent,
} from '@mapconductor/js-sdk-core';
import { ArcGISMarkerController } from './marker/ArcGISMarkerController';
import { ArcGISCircleOverlayController } from './circle/ArcGISCircleController';
import { ArcGISPolylineOverlayController } from './polyline/ArcGISPolylineController';
import { ArcGISPolygonOverlayController } from './polygon/ArcGISPolygonController';
import { ArcGISGroundImageController } from './groundimage/ArcGISGroundImageController';
import { ArcGISRasterLayerController } from './raster/ArcGISRasterLayerController';
import { ArcGISViewHolder } from './ArcGISViewHolder';
import { ArcGISDesign, type ArcGISDesignTypeInterface } from './ArcGISMapDesign';
import Basemap from '@arcgis/core/Basemap';

export type ArcGISDesignTypeChangeHandler = (value: ArcGISDesignTypeInterface) => void;

const WEB_MERCATOR_CIRCUMFERENCE_METERS = 2 * Math.PI * 6378137;
const TILE_SIZE = 256;
const DPI = 96;
const INCHES_PER_METER = 39.37;

export function arcGISZoomToScale(zoom: number, latitude: number): number {
  // ArcGIS JS MapView.scale is a Web Mercator display scale. Applying a
  // ground-resolution cos(latitude) correction here makes the same logical
  // zoom increasingly magnified toward the poles compared with MapLibre.
  void latitude;
  const resolution = WEB_MERCATOR_CIRCUMFERENCE_METERS / (TILE_SIZE * 2 ** zoom);
  return resolution * DPI * INCHES_PER_METER;
}

export function arcGISScaleToZoom(scale: number, latitude: number): number {
  // Keep this as the exact inverse of arcGISZoomToScale.
  void latitude;
  const resolution = scale / (DPI * INCHES_PER_METER);
  return Math.log(WEB_MERCATOR_CIRCUMFERENCE_METERS / (TILE_SIZE * resolution)) / Math.log(2);
}

export class ArcGISMapViewController
  extends BaseMapViewController
  implements
    MapViewControllerInterface,
    MarkerCapable,
    CircleCapable,
    PolylineCapable,
    PolygonCapable,
    GroundImageCapable,
    RasterLayerCapable
{
  private readonly eventCleanup: (() => void)[] = [];
  private initialized = false;
  private mapDesignType: ArcGISDesignTypeInterface;
  private mapDesignTypeChangeListener: ArcGISDesignTypeChangeHandler | null = null;

  constructor(
    readonly holder: ArcGISViewHolder,
    private readonly markerController: ArcGISMarkerController,
    private readonly circleController: ArcGISCircleOverlayController,
    private readonly polylineController: ArcGISPolylineOverlayController,
    private readonly polygonController: ArcGISPolygonOverlayController,
    private readonly groundImageController: ArcGISGroundImageController,
    private readonly rasterLayerController: ArcGISRasterLayerController,
    mapDesignType: ArcGISDesignTypeInterface = ArcGISDesign.Streets,
  ) {
    super();
    this.mapDesignType = mapDesignType;
    this.setupEventListeners();
  }

  getMap(): __esri.SceneView | __esri.MapView {
    return this.holder.map;
  }

  setMapDesignType(value: ArcGISDesignTypeInterface): void {
    this.mapDesignType = value;
    const map = this.holder.map.map;
    if (map) {
      map.basemap = new Basemap({
        style: { id: ArcGISDesign.toBasemapStyle(value) },
      });
    }
    this.mapDesignTypeChangeListener?.(value);
  }

  setMapDesignTypeChangeListener(listener: ArcGISDesignTypeChangeHandler | null): void {
    this.mapDesignTypeChangeListener = listener;
    listener?.(this.mapDesignType);
  }

  private setupEventListeners(): void {
    const view = this.holder.map;
    if (view.ready) this.initialized = true;
    let isMoving = false;

    const notifyMoveStartIfNeeded = () => {
      if (!isMoving) {
        isMoving = true;
        const camera = this.getCameraPosition();
        if (camera) this.notifyCameraMoveStart(camera);
      }
    };

    const handleViewpointChange = () => {
      if (!view.stationary) notifyMoveStartIfNeeded();
      if (!isMoving) return;

      const camera = this.getCameraPosition();
      if (camera) this.notifyCameraMove(camera);
    };

    const handleStationaryChange = (stationary: boolean) => {
      if (!stationary) {
        notifyMoveStartIfNeeded();
        return;
      }

      if (!isMoving) return;
      const camera = this.getCameraPosition();
      if (camera) {
        this.notifyCameraMove(camera);
        this.notifyCameraMoveEnd(camera);
      }
      isMoving = false;
    };

    const handleClick = async (event: __esri.ViewClickEvent) => {
      const position = event.mapPoint;
      if (!position) return;
      const point = createGeoPoint({
        latitude: position.latitude ?? 0,
        longitude: position.longitude ?? 0,
        altitude: position.z ?? undefined,
      });

      if (await this.handleMarkerClick(event)) return;
      if (await this.handleCircleClick(event, point)) return;
      if (await this.handlePolygonClick(event, point)) return;
      if (await this.handlePolylineClick(event)) return;
      if (await this.handleGroundImageClick(event, point)) return;

      this.notifyMapClick(point);
    };

    const eventView = view as any;
    const cameraWatchProperty = view.type === '3d' ? ['camera', 'viewpoint'] : 'viewpoint';
    const handles = [
      eventView.on('click', handleClick),
      eventView.on('layerview-create', () => {
        this.initialized = true;
        this.notifyMapInitialized();
      }),
      eventView.watch(cameraWatchProperty, handleViewpointChange),
      eventView.watch('stationary', handleStationaryChange),
    ];
    this.eventCleanup.push(() => handles.forEach((handle) => handle?.remove()));
  }

  override setMapInitializedListener(listener: OnMapInitializedHandler | null): void {
    super.setMapInitializedListener(listener);
    if (listener && this.initialized) this.notifyMapInitialized();
  }

  /**
   * Called by the provider's ResizeObserver when the view container's size
   * changes. getCameraPosition() re-derives zoom from the current viewport
   * height (see ZoomAltitudeConverter), so this just needs to push a fresh
   * notification through the usual channel instead of leaving listeners with
   * a stale zoom until the next real camera move.
   */
  notifyViewportResized(): void {
    const camera = this.getCameraPosition();
    if (!camera) return;
    this.notifyCameraMove(camera);
    this.notifyCameraMoveEnd(camera);
  }

  moveCamera(position: MapCameraPosition): Promise<boolean> {
    if (this.holder.map.type === '2d') {
      return this.holder.map.goTo({
        center: [position.position.longitude, position.position.latitude],
        scale: arcGISZoomToScale(position.zoom, position.position.latitude),
        rotation: position.bearing,
      }).then(() => true).catch(() => false);
    }
    const cameraOptions = this.holder.zoomConverter.mapCameraPositionToCameraOptions(position);
    if (!cameraOptions) return Promise.resolve(false);

    return this.holder.map.goTo(cameraOptions).then(() => true).catch(() => false);
  }

  async animateCamera(position: MapCameraPosition, options?: CameraOptions): Promise<boolean> {
    if (this.holder.map.type === '2d') {
      const duration = options?.duration ?? 1000;
      return this.holder.map.goTo({
        center: [position.position.longitude, position.position.latitude],
        scale: arcGISZoomToScale(position.zoom, position.position.latitude),
        rotation: position.bearing,
      }, { duration }).then(() => true).catch(() => false);
    }
    const cameraOptions = this.holder.zoomConverter.mapCameraPositionToCameraOptions(position);
    if (!cameraOptions) return Promise.resolve(false);

    const duration = options?.duration ?? 1000;
    return this.holder.map.goTo(cameraOptions, { duration, speedFactor: 1 }).then(() => true).catch(() => false);
  }

  async fitBounds(bounds: GeoRectBounds, options?: CameraOptions): Promise<boolean> {
    if (!bounds.southWest || !bounds.northEast) return Promise.resolve(false);

    const extent = {
      xmin: bounds.southWest.longitude,
      ymin: bounds.southWest.latitude,
      xmax: bounds.northEast.longitude,
      ymax: bounds.northEast.latitude,
      spatialReference: { wkid: 4326 },
    };

    const padding = options?.padding ?? 64;
    return this.holder.map.goTo(extent, { padding } as any).then(() => true).catch(() => false);
  }

  getCameraPosition(): MapCameraPosition | null {
    if (this.holder.map.type === '2d') {
      const view = this.holder.map;
      const center = view.center;
      if (!center) return null;
      return createMapCameraPosition({
        position: createGeoPoint({
          latitude: center.latitude ?? center.y,
          longitude: center.longitude ?? center.x,
        }),
        zoom: arcGISScaleToZoom(view.scale, center.latitude ?? center.y),
        bearing: view.rotation,
        tilt: 0,
        visibleRegion: this.getVisibleRegion(),
      });
    }
    const camera = (this.holder.map as __esri.SceneView).camera;
    if (!camera) return null;

    const latitude = camera.position.latitude ?? camera.position.y ?? 0;
    const longitude = camera.position.longitude ?? camera.position.x ?? 0;

    const zoom = this.holder.zoomConverter.altitudeToZoomLevel({
      altitude: camera.position.z ?? 0,
      latitude,
      tilt: camera.tilt ?? 0,
    });

    return createMapCameraPosition({
      position: createGeoPoint({
        latitude,
        longitude,
        altitude: camera.position.z ?? undefined,
      }),
      zoom,
      bearing: camera.heading ?? 0,
      tilt: camera.tilt ?? 0,
      visibleRegion: this.getVisibleRegion(),
    });
  }

  getBounds(): GeoRectBounds | null {
    return this.getVisibleRegion()?.bounds ?? null;
  }

  private getVisibleRegion(): VisibleRegion | null {
    const extent = this.holder.map.extent;
    if (!extent) return null;

    const bounds = createGeoRectBounds();
    bounds.extend(createGeoPoint({
      latitude: extent.ymin,
      longitude: extent.xmin,
    }));
    bounds.extend(createGeoPoint({
      latitude: extent.ymax,
      longitude: extent.xmax,
    }));

    return {
      bounds,
      nearLeft: createGeoPoint({
        latitude: extent.ymin,
        longitude: extent.xmin,
      }),
      nearRight: createGeoPoint({
        latitude: extent.ymin,
        longitude: extent.xmax,
      }),
      farLeft: createGeoPoint({
        latitude: extent.ymax,
        longitude: extent.xmin,
      }),
      farRight: createGeoPoint({
        latitude: extent.ymax,
        longitude: extent.xmax,
      }),
    };
  }

  private async handleMarkerClick(event: __esri.ViewClickEvent): Promise<boolean> {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;

    const marker = this.markerController.find(position);
    if (marker) {
      this.markerController.dispatchClick(marker.state);
      return true;
    }
    return false;
  }

  private async handleCircleClick(event: __esri.ViewClickEvent, clicked: any): Promise<boolean> {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;

    const circle = this.circleController.find(position);
    if (circle) {
      const circleEvent: CircleEvent = { state: circle.state, clicked };
      this.circleController.dispatchClick(circleEvent);
      return true;
    }
    return false;
  }

  private async handlePolygonClick(event: __esri.ViewClickEvent, clicked: any): Promise<boolean> {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;

    const polygon = this.polygonController.find(position);
    if (polygon) {
      const polygonEvent: PolygonEvent = { state: polygon.state, clicked };
      this.polygonController.dispatchClick(polygonEvent);
      return true;
    }
    return false;
  }

  private async handlePolylineClick(event: __esri.ViewClickEvent): Promise<boolean> {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;

    const hitResult = this.polylineController.findWithClosestPoint(position);
    if (hitResult) {
      const polylineEvent: PolylineEvent = { 
        state: hitResult.entity.state, 
        clicked: hitResult.closestPoint 
      };
      this.polylineController.dispatchClick(polylineEvent);
      return true;
    }
    return false;
  }

  private async handleGroundImageClick(event: __esri.ViewClickEvent, clicked: any): Promise<boolean> {
    const screenPoint = { x: event.x, y: event.y };
    const position = this.holder.fromScreenOffsetSync(screenPoint);
    if (!position) return false;

    const groundImage = this.groundImageController.find(position);
    if (groundImage) {
      const groundImageEvent: GroundImageEvent = { state: groundImage.state, clicked };
      this.groundImageController.dispatchClick(groundImageEvent);
      return true;
    }
    return false;
  }

  async compositionMarkers(data: MarkerState[]): Promise<void> {
    await this.markerController.composition(data);
  }

  async updateMarker(state: MarkerState): Promise<void> {
    await this.markerController.update(state);
  }

  hasMarker(state: MarkerState): boolean {
    return this.markerController.has(state);
  }

  setOnMarkerClickListener(listener: OnMarkerEventHandler | null): void {
    this.markerController.setOnClickListener(listener);
  }

  setOnMarkerDragStart(listener: OnMarkerEventHandler | null): void {
    this.markerController.setOnDragStart(listener);
  }

  setOnMarkerDrag(listener: OnMarkerEventHandler | null): void {
    this.markerController.setOnDrag(listener);
  }

  setOnMarkerDragEnd(listener: OnMarkerEventHandler | null): void {
    this.markerController.setOnDragEnd(listener);
  }

  setOnMarkerAnimateStart(listener: OnMarkerEventHandler | null): void {
    this.markerController.setOnAnimateStart(listener);
  }

  setOnMarkerAnimateEnd(listener: OnMarkerEventHandler | null): void {
    this.markerController.setOnAnimateEnd(listener);
  }

  setMarkerAnimationOverlayHost(host: MarkerAnimationOverlayHost | null): void {
    this.markerController.setMarkerAnimationOverlayHost(host);
  }

  setOnCircleClickListener(listener: OnCircleEventHandler | null): void {
    this.circleController.setOnClickListener(listener);
  }

  setOnPolylineClickListener(listener: OnPolylineEventHandler | null): void {
    this.polylineController.setOnClickListener(listener);
  }

  setOnPolygonClickListener(listener: OnPolygonEventHandler | null): void {
    this.polygonController.setOnClickListener(listener);
  }

  setOnGroundImageClickListener(listener: OnGroundImageEventHandler | null): void {
    this.groundImageController.setOnClickListener(listener);
  }

  async compositionCircles(data: CircleState[]): Promise<void> {
    await this.circleController.composition(data);
  }

  async updateCircle(state: CircleState): Promise<void> {
    await this.circleController.update(state);
  }

  hasCircle(state: CircleState): boolean {
    return this.circleController.has(state);
  }

  async compositionPolylines(data: PolylineState[]): Promise<void> {
    await this.polylineController.composition(data);
  }

  async updatePolyline(state: PolylineState): Promise<void> {
    await this.polylineController.update(state);
  }

  hasPolyline(state: PolylineState): boolean {
    return this.polylineController.has(state);
  }

  async compositionPolygons(data: PolygonState[]): Promise<void> {
    await this.polygonController.composition(data);
  }

  async updatePolygon(state: PolygonState): Promise<void> {
    await this.polygonController.update(state);
  }

  hasPolygon(state: PolygonState): boolean {
    return this.polygonController.has(state);
  }

  async compositionGroundImages(data: GroundImageState[]): Promise<void> {
    await this.groundImageController.composition(data);
  }

  async updateGroundImage(state: GroundImageState): Promise<void> {
    await this.groundImageController.update(state);
  }

  hasGroundImage(state: GroundImageState): boolean {
    return this.groundImageController.has(state);
  }

  async compositionRasterLayers(data: RasterLayerState[]): Promise<void> {
    await this.rasterLayerController.composition(data);
  }

  async updateRasterLayer(state: RasterLayerState): Promise<void> {
    await this.rasterLayerController.update(state);
  }

  hasRasterLayer(state: RasterLayerState): boolean {
    return this.rasterLayerController.has(state);
  }

  async clearOverlays(): Promise<void> {
    this.markerController.clear();
    this.circleController.clear();
    this.polylineController.clear();
    this.polygonController.clear();
    this.groundImageController.clear();
    this.rasterLayerController.clear();
  }

  destroy(): void {
    void this.clearOverlays();
    for (const fn of this.eventCleanup) fn();
    this.eventCleanup.length = 0;
  }
}
