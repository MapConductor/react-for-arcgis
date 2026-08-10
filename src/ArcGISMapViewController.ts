import {
  BaseMapViewController,
  MapUISettingsDiagnostics,
  MapUISettings,
  Earth,
  computeFitBoundsCameraPosition,
  createGeoPoint,
  type CircleCapable,
  type GeoRectBounds,
  type GroundImageCapable,
  type MapCameraPosition,
  type MarkerAnimationOverlayHost,
  type OnMapInitializedHandler,
  type MapViewControllerInterface,
  type MarkerCapable,
  type OnMarkerEventHandler,
  type PolygonCapable,
  type PolylineCapable,
  type RasterLayerCapable,
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
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';
import {
  applyCamera,
  readCameraPosition,
  type CameraDeps,
} from './ArcGISCameraOps';
import {
  handleCircleClick,
  handleGroundImageClick,
  handleMarkerClick,
  handlePolygonClick,
  handlePolylineClick,
  type ClickDeps,
} from './ArcGISClickHandlers';

export type ArcGISDesignTypeChangeHandler = (value: ArcGISDesignTypeInterface) => void;

const WEB_MERCATOR_CIRCUMFERENCE_METERS = Earth.CIRCUMFERENCE_METERS;
const TILE_SIZE = 256;
const DPI = 96;
const INCHES_PER_METER = 39.37;

export function arcGISZoomToScale(zoom: number, latitude: number, snapZoom = true): number {
  // ArcGIS JS MapView.scale is a Web Mercator display scale. Applying a
  // ground-resolution cos(latitude) correction here makes the same logical
  // zoom increasingly magnified toward the poles compared with MapLibre.
  void latitude;
  // Google Maps 2D (the project-wide reference) snaps zoom to the nearest
  // integer (9.5 -> 10), while MapView's snapToZoom constraint resolves a
  // fractional goTo target to the LOD below it (9.5 -> 9), leaving the two
  // maps a full level apart. Quantize the way Google does so goTo targets are
  // always exact LOD scales that snapToZoom passes through unchanged.
  //
  // fitBounds passes snapZoom:false to keep its fractional fit zoom — rounding
  // it would break the fit and make `padding` have no visible effect. For that
  // fractional scale to survive, the MapView is created with
  // `constraints.snapToZoom = false` (see ArcGISMapProvider); normal moves still
  // pass snapZoom:true here, so they land on exact LOD scales and stay
  // Google-aligned.
  const effectiveZoom = snapZoom ? Math.round(zoom) : zoom;
  const resolution = WEB_MERCATOR_CIRCUMFERENCE_METERS / (TILE_SIZE * 2 ** effectiveZoom);
  return resolution * DPI * INCHES_PER_METER;
}

export function arcGISScaleToZoom(scale: number, latitude: number): number {
  // Exact inverse of arcGISZoomToScale for the integer zooms it produces;
  // reports fractional zoom faithfully for in-between scales (e.g. while the
  // view is animating).
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

  /**
   * 2D で直近に要求した論理 tilt。2D `MapView` はカメラピッチを持てないため、
   * 負 tilt は中心の前進で表現しており（`ArcGIS2DTiltEmulation`）、読み戻しで元へ
   * 戻すヒントとして保持する。見た目の傾きの購読にも使う。
   */
  private currentLogicalTilt = 0;

  /** 論理 tilt が変わったことをビュー層へ伝える（CSS の rotateX に使う）。 */
  onVisualTiltChanged: ((tilt: number) => void) | null = null;

  /** 現在の論理 tilt。 */
  getLogicalTilt(): number { return this.currentLogicalTilt; }

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

    // Capable ファサードの既定実装がここから kind で引く。

    // **登録を忘れると composition が黙って捨てられる。**

    this.registerOverlayController(this.markerController);

    this.registerOverlayController(this.circleController);

    this.registerOverlayController(this.polylineController);

    this.registerOverlayController(this.polygonController);

    this.registerOverlayController(this.groundImageController);

    this.registerOverlayController(this.rasterLayerController);
    this.mapDesignType = mapDesignType;
    this.markerController.onRasterLayerUpdate = async (state) => {
      if (state) {
        await this.rasterLayerController.composition([state]);
      } else {
        await this.rasterLayerController.clear();
      }
    };
    this.setupEventListeners();
  }

  getMap(): __esri.SceneView | __esri.MapView {
    return this.holder.map;
  }

  private uiSettings: MapUISettings = { ...MapUISettings.Default };
  private gestureGuardsInstalled = false;

  /**
   * ArcGIS routes navigation through `navigation.actionMap`, which says what
   * each drag button does, plus a few view-level properties. Double-click zoom
   * has no property, so it is stopped at the event instead — the handler is
   * installed once and reads the current flags.
   *
   * A 3D view tilts with the same drag that rotates, and a 2D view has no tilt
   * at all, so `tiltGesture` cannot be honoured on its own.
   */
  applyUISettings(settings: MapUISettings): void {
    this.uiSettings = settings;
    const view = this.holder.map;

    view.navigation.browserTouchPanEnabled = settings.scrollGesture;
    view.navigation.actionMap.dragPrimary = settings.scrollGesture ? 'pan' : 'none';
    view.navigation.actionMap.dragSecondary = settings.rotateGesture ? 'rotate' : 'none';
    view.navigation.actionMap.dragTertiary = settings.rotateGesture ? 'rotate' : 'none';
    view.navigation.actionMap.mouseWheel = settings.zoomGesture ? 'zoom' : 'none';
    if (view.type === '2d') view.constraints.rotationEnabled = settings.rotateGesture;

    if (!this.gestureGuardsInstalled) {
      this.gestureGuardsInstalled = true;
      view.on('double-click', (event: __esri.ViewDoubleClickEvent) => {
        if (!this.uiSettings.zoomGesture) event.stopPropagation();
      });
    }

    MapUISettingsDiagnostics.warnIfRequested(
      settings.tiltGesture, 'tilt', 'ArcGIS',
      view.type === '2d'
        ? 'a 2D MapView is always overhead and has no tilt gesture'
        : 'one drag changes heading and tilt together, so tilt follows rotateGesture',
    );
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

      if (await handleMarkerClick(this.clickDeps, event)) return;
      if (await handleCircleClick(this.clickDeps, event, point)) return;
      if (await handlePolygonClick(this.clickDeps, event, point)) return;
      if (await handlePolylineClick(this.clickDeps, event)) return;
      if (await handleGroundImageClick(this.clickDeps, event, point)) return;

      this.notifyMapClick(point);
    };

    const eventView = view as __esri.MapView;
    const handles = [
      eventView.on('click', handleClick),
      eventView.on('layerview-create', () => {
        this.initialized = true;
        this.notifyMapInitialized();
      }),
      view.type === '3d'
        ? reactiveUtils.watch(() => [view.camera, view.viewpoint], handleViewpointChange)
        : reactiveUtils.watch(() => (view as __esri.MapView).viewpoint, handleViewpointChange),
      reactiveUtils.watch(() => view.stationary, handleStationaryChange),
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

  getCameraPosition(): MapCameraPosition | null { return readCameraPosition(this.cameraDeps); }

  private get cameraDeps(): CameraDeps {
    return {
      holder: this.holder,
      logicalTilt: () => this.currentLogicalTilt,
      setLogicalTilt: (tilt) => {
        if (this.currentLogicalTilt === tilt) return;
        this.currentLogicalTilt = tilt;
        // ビューを傾けると地図の中身は縦に潰れる。マーカーだけは立って見えるよう、
        // アイコンを先に縦へ引き伸ばす（他のオーバーレイは寝たままでよい）。
        this.markerController.refreshVerticalStretch(tilt);
        this.onVisualTiltChanged?.(tilt);
      },
    };
  }

  /** クリック配送へ渡す依存一式。private を覗かせずに必要なものだけ束ねる。 */
  private get clickDeps(): ClickDeps {
    return {
      holder: this.holder,
      markerController: this.markerController,
      circleController: this.circleController,
      polylineController: this.polylineController,
      polygonController: this.polygonController,
      groundImageController: this.groundImageController,
      getCameraPosition: () => this.getCameraPosition(),
    };
  }

  moveCamera(position: MapCameraPosition): Promise<boolean> {
    return applyCamera(this.cameraDeps, position, { animated: false });
  }

  async animateCamera(position: MapCameraPosition, durationMillis: number): Promise<boolean> {
    return applyCamera(this.cameraDeps, position, { animated: true, duration: durationMillis });
  }

  // Unified fit: the core computes center + zoom; moveCamera keeps the current
  // rotation/tilt (ArcGIS goTo to an extent frames it north-up).
  fitBounds(bounds: GeoRectBounds, padding: number): Promise<boolean> {
    if (!bounds.southWest || !bounds.northEast) return Promise.resolve(false);
    const view = this.holder.map;
    const current = this.getCameraPosition();
    if (!current) return Promise.resolve(false);
    const fit = computeFitBoundsCameraPosition({
      bounds,
      viewportWidthPx: view.width,
      viewportHeightPx: view.height,
      padding,
      bearing: current.bearing,
    });
    if (!fit) return Promise.resolve(false);
    const target = current.copy({ position: fit.center, zoom: fit.zoom });
    // snapZoom:false — keep the fractional fit zoom so `padding` is honored.
    return applyCamera(this.cameraDeps, target, { animated: false, snapZoom: false });
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
    this.markerController.destroy();
    for (const fn of this.eventCleanup) fn();
    this.eventCleanup.length = 0;
  }
}
