import { MapConfig, MarkerTilingOptions, GeoRectBounds, MapProvider, MapViewControllerInterface, MarkerOverlayRenderer, MarkerEntity, AbstractZoomAltitudeConverter, MapCameraPosition, MapViewHolderBase, GeoPointInterface, Offset, GeoPoint, AbstractMarkerOverlayRenderer, BitmapIcon, AddParams, ChangeParams, AbstractMarkerController, MarkerState, RasterLayerState, CircleOverlayRenderer, CircleEntity, CircleAddParams, CircleChangeParams, CircleController, PolylineOverlayRenderer, PolylineEntity, PolylineAddParams, PolylineChangeParams, PolylineController, PolygonOverlayRenderer, PolygonEntity, PolygonAddParams, PolygonChangeParams, PolygonController, GroundImageOverlayRenderer, GroundImageEntity, GroundImageAddParams, GroundImageChangeParams, GroundImageController, RasterLayerOverlayRenderer, RasterLayerEntity, RasterLayerAddParams, RasterLayerChangeParams, RasterLayerController, RasterHeaderSupport, BaseMapViewController, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable, MapUISettings, OnMapInitializedHandler, OnMarkerEventHandler, MarkerAnimationOverlayHost, MapViewBaseProps } from '@mapconductor/js-sdk-core';
import { ArcGISDesignTypeInterface, ArcGISMapViewStateInterface } from './state.js';
export { ArcGISDesign, ArcGISDesignType, ArcGISMapViewState, ArcGISMapViewStateParams, ArcGISViewState, ArcGISViewStateOptions, useArcGISViewState } from './state.js';
import Layer from '@arcgis/core/layers/Layer';
import ImageElement from '@arcgis/core/layers/support/ImageElement';
import Graphic from '@arcgis/core/Graphic';
import MapView from '@arcgis/core/views/MapView';
import SceneView from '@arcgis/core/views/SceneView';
import { CameraProperties } from '@arcgis/core/Camera';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import { MediaElement } from '@arcgis/core/layers/media/types';
import Collection from '@arcgis/core/core/Collection';
import * as React from 'react';
import React__default from 'react';

interface ArcGISMapViewInitOptions {
    basemapStyle: string;
    elevationSources: readonly string[];
}
interface ArcGISConfig extends MapConfig {
    apiKey?: string;
    mapDesignType?: ArcGISDesignTypeInterface;
    markerTilingOptions?: MarkerTilingOptions;
    useSceneView?: boolean;
    minZoom?: number;
    maxZoom?: number;
    /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
    restrictBounds?: GeoRectBounds;
}

declare class ArcGISMapProvider extends MapProvider {
    private resizeObserver;
    private restrictBoundsWatchdog;
    initialize(config: ArcGISConfig): Promise<MapViewControllerInterface>;
    destroy(): void;
    private createBasemap;
}

type ArcGISActualMarker = Graphic;
type ArcGISActualMap = SceneView | MapView;
type ArcGISActualCircle = Graphic;
type ArcGISActualPolyline = Graphic;
type ArcGISActualPolygon = Graphic;
type ArcGISActualGroundImage = ImageElement;
type ArcGISActualRasterLayer = Layer;

interface ArcGISMarkerRendererInterface<ActualMarker = ArcGISActualMarker> extends MarkerOverlayRenderer<ActualMarker> {
    createMarker(state: MarkerEntity<ActualMarker>): ActualMarker | null;
    updateMarker(marker: ActualMarker, state: MarkerEntity<ActualMarker>): void;
    removeMarker(marker: ActualMarker): void;
}

interface ZoomAltitudeViewportSize {
    width: number;
    height: number;
}
declare class ZoomAltitudeConverter extends AbstractZoomAltitudeConverter {
    private readonly viewportSizeProvider;
    static readonly ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE = 136500000;
    static readonly REFERENCE_VIEWPORT_HEIGHT_PX = 720;
    static readonly SCENE_VIEW_DIAGONAL_FOV_DEG = 55;
    constructor(zoom0Altitude?: number, viewportSizeProvider?: (() => ZoomAltitudeViewportSize | null) | null);
    private effectiveZoom0Altitude;
    private cosLatitudeFactor;
    private cosTiltFactor;
    zoomLevelToAltitude({ zoomLevel, latitude, tilt, }: {
        zoomLevel: number;
        latitude: number;
        tilt: number;
    }): number;
    altitudeToZoomLevel({ altitude, latitude, tilt, }: {
        altitude: number;
        latitude: number;
        tilt: number;
    }): number;
    zoomLevelToDistance({ zoomLevel, latitude, }: {
        zoomLevel: number;
        latitude: number;
    }): number;
    distanceToZoomLevel({ distance, latitude, }: {
        distance: number;
        latitude: number;
    }): number;
    mapCameraPositionToCameraOptions(cameraPosition: MapCameraPosition | null, { snapZoom }?: {
        snapZoom?: boolean;
    }): CameraProperties | null;
}

declare class ArcGISViewHolder extends MapViewHolderBase<HTMLElement, SceneView | MapView> {
    readonly mapView: HTMLElement;
    readonly map: SceneView | MapView;
    readonly zoomConverter: ZoomAltitudeConverter;
    constructor(mapView: HTMLElement, map: SceneView | MapView, zoomConverter: ZoomAltitudeConverter);
    toScreenOffset(position: GeoPointInterface): Offset | null;
    fromScreenOffsetSync(offset: Offset): GeoPoint | null;
}

declare class ArcGISMarkerRenderer extends AbstractMarkerOverlayRenderer<ArcGISViewHolder, Graphic> implements ArcGISMarkerRendererInterface<Graphic> {
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: GraphicsLayer);
    createMarker(entity: MarkerEntity<Graphic>, bitmapIcon?: BitmapIcon): Graphic | null;
    updateMarker(graphic: Graphic, entity: MarkerEntity<Graphic>, bitmapIcon?: BitmapIcon): void;
    removeMarker(graphic: Graphic): void;
    onAdd(data: AddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: ChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: MarkerEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    setMarkerPosition(entity: MarkerEntity<Graphic>, position: GeoPoint): void;
    setMarkerVisible(entity: MarkerEntity<Graphic>, visible: boolean): void;
    /**
     * 2D で地図コンテナを CSS `rotateX` で傾けているぶん、マーカーだけ先に縦へ引き伸ばして
     * 潰れを打ち消す倍率（`ArcGIS2DTiltEmulation.markerVerticalStretch`）。3D は常に 1。
     */
    private verticalStretch;
    /**
     * 縦補正の倍率を更新する。変化したら `true`（呼び出し元が既存シンボルを作り直す）。
     */
    setVerticalStretchForTilt(tilt: number): boolean;
    /** 既存マーカーのシンボルを、現在の縦補正で作り直す。 */
    rebuildSymbol(marker: Graphic, bitmapIcon: BitmapIcon): void;
    private createMarkerSymbol;
}

declare abstract class AbstractArcGISController<ActualMarker = ArcGISActualMarker, Renderer extends ArcGISMarkerRendererInterface<ActualMarker> = ArcGISMarkerRendererInterface<ActualMarker>> extends AbstractMarkerController<ActualMarker> {
    readonly renderer: Renderer;
    constructor(renderer: Renderer, _tilingOptions?: MarkerTilingOptions);
    protected onMarkerAdded(entity: MarkerEntity<ActualMarker>): void;
    protected abstract attachListeners(marker: ActualMarker, state: MarkerState): void;
}

declare class ArcGISMarkerController extends AbstractArcGISController<Graphic, ArcGISMarkerRenderer> {
    private readonly tilingOptions;
    private dragHandle;
    private dragEntity;
    private dragOrigin;
    private dragStarted;
    private tileRenderer;
    private tileRouteId;
    private tileVersion;
    private tileGeneration;
    /**
     * 2D の tilt 表現が変わったときに、マーカーの縦補正を掛け直す。
     *
     * 地図コンテナを CSS `rotateX` で傾けると中身が縦に潰れるので、マーカーだけ先に
     * 縦へ引き伸ばして立って見えるようにする（他のオーバーレイは寝たままでよい）。
     */
    refreshVerticalStretch(tilt: number): void;
    /** Called by ArcGISMapViewController when RasterLayerState changes. */
    onRasterLayerUpdate: ((state: RasterLayerState | null) => Promise<void>) | null;
    constructor(renderer: ArcGISMarkerRenderer, tilingOptions?: MarkerTilingOptions);
    protected shouldTile(state: MarkerState, totalCount: number): boolean;
    protected onTiledMarkersChanged(): Promise<void>;
    findTiled(position: GeoPoint, zoom: number): MarkerEntity<Graphic> | null;
    private syncTiledOverlay;
    private removeTileOverlay;
    clear(): Promise<void>;
    protected attachListeners(_marker: Graphic, _state: MarkerState): void;
    update(state: MarkerState): Promise<void>;
    destroy(): void;
    private readonly handleViewDrag;
    /**
     * ドラッグ位置はカーソル座標をそのまま使う（アンカー ＝ カーソル）。
     * 多くの JS 地図 SDK がこの挙動で、掴んだ瞬間にピンが少し跳ね上がることが
     * 「今ドラッグしている」という手掛かりになる。3 プラットフォームでこれに統一している。
     */
    private dragPositionFromEvent;
    private moveMarkerGraphic;
    findAtScreen(screen: Offset, zoom?: number): MarkerEntity<Graphic> | null;
    private findDraggableAtScreen;
    private findHitAtScreen;
}

declare class ArcGISCircleOverlayRenderer implements CircleOverlayRenderer<Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: GraphicsLayer);
    createCircle(entity: CircleEntity<Graphic>): Graphic | null;
    updateCircle(graphic: Graphic, entity: CircleEntity<Graphic>): void;
    private createCircleGeometry;
    removeCircle(graphic: Graphic): void;
    onAdd(data: CircleAddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: CircleChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: CircleEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    private createCircleSymbol;
}

declare class ArcGISCircleOverlayController extends CircleController<Graphic> {
    readonly renderer: ArcGISCircleOverlayRenderer;
    constructor(renderer: ArcGISCircleOverlayRenderer);
}

declare class ArcGISPolylineOverlayRenderer implements PolylineOverlayRenderer<Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: GraphicsLayer);
    createPolyline(entity: PolylineEntity<Graphic>): Graphic | null;
    updatePolyline(graphic: Graphic, entity: PolylineEntity<Graphic>): void;
    removePolyline(graphic: Graphic): void;
    onAdd(data: PolylineAddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: PolylineChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: PolylineEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    private createGeometry;
    private createLineSymbol;
    private lineStyleToArcGISStyle;
}

declare class ArcGISPolylineOverlayController extends PolylineController<Graphic> {
    readonly renderer: ArcGISPolylineOverlayRenderer;
    constructor(renderer: ArcGISPolylineOverlayRenderer);
}

declare class ArcGISPolygonOverlayRenderer implements PolygonOverlayRenderer<Graphic> {
    readonly holder: ArcGISViewHolder;
    private graphicsLayer;
    constructor(holder: ArcGISViewHolder, graphicsLayer: GraphicsLayer);
    createPolygon(entity: PolygonEntity<Graphic>): Graphic | null;
    updatePolygon(graphic: Graphic, entity: PolygonEntity<Graphic>): void;
    removePolygon(graphic: Graphic): void;
    onAdd(data: PolygonAddParams[]): Promise<(Graphic | null)[]>;
    onChange(data: PolygonChangeParams<Graphic>[]): Promise<(Graphic | null)[]>;
    onRemove(data: PolygonEntity<Graphic>[]): Promise<void>;
    onPostProcess(): Promise<void>;
    private createGeometry;
    private createFillSymbol;
}

declare class ArcGISPolygonOverlayController extends PolygonController<Graphic> {
    readonly renderer: ArcGISPolygonOverlayRenderer;
    constructor(renderer: ArcGISPolygonOverlayRenderer);
}

declare class ArcGISGroundImageOverlayRenderer implements GroundImageOverlayRenderer<ImageElement> {
    readonly holder: ArcGISViewHolder;
    private elements;
    constructor(holder: ArcGISViewHolder, elements: Collection<MediaElement>);
    createGroundImage(entity: GroundImageEntity<ImageElement>): ImageElement | null;
    updateGroundImage(element: ImageElement, entity: GroundImageEntity<ImageElement>): void;
    removeGroundImage(element: ImageElement): void;
    onAdd(data: GroundImageAddParams[]): Promise<(ImageElement | null)[]>;
    onChange(data: GroundImageChangeParams<ImageElement>[]): Promise<(ImageElement | null)[]>;
    onRemove(data: GroundImageEntity<ImageElement>[]): Promise<void>;
    onPostProcess(): Promise<void>;
}

declare class ArcGISGroundImageController extends GroundImageController<ImageElement> {
    readonly renderer: ArcGISGroundImageOverlayRenderer;
    constructor(renderer: ArcGISGroundImageOverlayRenderer);
}

declare class ArcGISRasterLayerOverlayRenderer implements RasterLayerOverlayRenderer<Layer> {
    readonly holder: ArcGISViewHolder;
    constructor(holder: ArcGISViewHolder);
    createRasterLayer(entity: RasterLayerEntity<Layer>): Promise<Layer | null>;
    removeRasterLayer(layer: Layer): Promise<void>;
    onAdd(data: RasterLayerAddParams[]): Promise<(Layer | null)[]>;
    onChange(data: RasterLayerChangeParams<Layer>[]): Promise<(Layer | null)[]>;
    onRemove(data: RasterLayerEntity<Layer>[]): Promise<void>;
    onCameraChanged(_mapCameraPosition: MapCameraPosition): Promise<void>;
    onPostProcess(): Promise<void>;
    private buildLayer;
}

declare class ArcGISRasterLayerController extends RasterLayerController<Layer> {
    /**
     * WebTileLayer のタイル取得に介入する口が無い（esriConfig.request.interceptors は
     * 未検証のため、確かめずに対応とは書かない）。
     *
     * userAgent はブラウザが上書きを許さないので、どのプロバイダでも web では効かない。
     */
    protected get headerSupport(): RasterHeaderSupport;
    readonly renderer: ArcGISRasterLayerOverlayRenderer;
    constructor(renderer: ArcGISRasterLayerOverlayRenderer);
}

type ArcGISDesignTypeChangeHandler = (value: ArcGISDesignTypeInterface) => void;
declare function arcGISZoomToScale(zoom: number, latitude: number, snapZoom?: boolean): number;
declare function arcGISScaleToZoom(scale: number, latitude: number): number;
declare class ArcGISMapViewController extends BaseMapViewController implements MapViewControllerInterface, MarkerCapable, CircleCapable, PolylineCapable, PolygonCapable, GroundImageCapable, RasterLayerCapable {
    readonly holder: ArcGISViewHolder;
    private readonly markerController;
    private readonly circleController;
    private readonly polylineController;
    private readonly polygonController;
    private readonly groundImageController;
    private readonly rasterLayerController;
    private readonly eventCleanup;
    /**
     * 2D で直近に要求した論理 tilt。2D `MapView` はカメラピッチを持てないため、
     * 負 tilt は中心の前進で表現しており（`ArcGIS2DTiltEmulation`）、読み戻しで元へ
     * 戻すヒントとして保持する。見た目の傾きの購読にも使う。
     */
    private currentLogicalTilt;
    /** 論理 tilt が変わったことをビュー層へ伝える（CSS の rotateX に使う）。 */
    onVisualTiltChanged: ((tilt: number) => void) | null;
    /** 現在の論理 tilt。 */
    getLogicalTilt(): number;
    private initialized;
    private mapDesignType;
    private mapDesignTypeChangeListener;
    constructor(holder: ArcGISViewHolder, markerController: ArcGISMarkerController, circleController: ArcGISCircleOverlayController, polylineController: ArcGISPolylineOverlayController, polygonController: ArcGISPolygonOverlayController, groundImageController: ArcGISGroundImageController, rasterLayerController: ArcGISRasterLayerController, mapDesignType?: ArcGISDesignTypeInterface);
    getMap(): SceneView | MapView;
    private uiSettings;
    private gestureGuardsInstalled;
    /**
     * ArcGIS routes navigation through `navigation.actionMap`, which says what
     * each drag button does, plus a few view-level properties. Double-click zoom
     * has no property, so it is stopped at the event instead — the handler is
     * installed once and reads the current flags.
     *
     * A 3D view tilts with the same drag that rotates, and a 2D view has no tilt
     * at all, so `tiltGesture` cannot be honoured on its own.
     */
    applyUISettings(settings: MapUISettings): void;
    setMapDesignType(value: ArcGISDesignTypeInterface): void;
    setMapDesignTypeChangeListener(listener: ArcGISDesignTypeChangeHandler | null): void;
    private setupEventListeners;
    setMapInitializedListener(listener: OnMapInitializedHandler | null): void;
    /**
     * Called by the provider's ResizeObserver when the view container's size
     * changes. getCameraPosition() re-derives zoom from the current viewport
     * height (see ZoomAltitudeConverter), so this just needs to push a fresh
     * notification through the usual channel instead of leaving listeners with
     * a stale zoom until the next real camera move.
     */
    notifyViewportResized(): void;
    getCameraPosition(): MapCameraPosition | null;
    private get cameraDeps();
    /** クリック配送へ渡す依存一式。private を覗かせずに必要なものだけ束ねる。 */
    private get clickDeps();
    moveCamera(position: MapCameraPosition): Promise<boolean>;
    animateCamera(position: MapCameraPosition, durationMillis: number): Promise<boolean>;
    fitBounds(bounds: GeoRectBounds, padding: number): Promise<boolean>;
    setOnMarkerClickListener(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragStart(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDrag(listener: OnMarkerEventHandler | null): void;
    setOnMarkerDragEnd(listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateStart(listener: OnMarkerEventHandler | null): void;
    setOnMarkerAnimateEnd(listener: OnMarkerEventHandler | null): void;
    setMarkerAnimationOverlayHost(host: MarkerAnimationOverlayHost | null): void;
    clearOverlays(): Promise<void>;
    destroy(): void;
}

interface ArcGISMapViewProps extends MapViewBaseProps<ArcGISMapViewStateInterface> {
    style?: React__default.CSSProperties;
    markerTilingOptions?: MarkerTilingOptions;
    minZoom?: number;
    maxZoom?: number;
    /** Restricts panning/zooming so the viewport cannot leave this rectangle. */
    restrictBounds?: GeoRectBounds;
    onError?: (error: Error) => void;
    children?: React__default.ReactNode;
}

declare function ArcGISMapView({ state, className, style, markerTilingOptions, minZoom, maxZoom, restrictBounds, cameraRestriction, onError, onMapLoaded, onMapClick, onMapLongClick, onCameraMoveStart, onCameraMove, onCameraMoveEnd, children, useSceneView, }: ArcGISMapViewProps & {
    useSceneView?: boolean;
}): React.JSX.Element;
declare function ArcGISMapView2D(props: ArcGISMapViewProps): React.JSX.Element;

export { type ArcGISActualCircle, type ArcGISActualGroundImage, type ArcGISActualMap, type ArcGISActualMarker, type ArcGISActualPolygon, type ArcGISActualPolyline, type ArcGISActualRasterLayer, type ArcGISConfig, type ArcGISDesignTypeChangeHandler, ArcGISDesignTypeInterface, ArcGISMapProvider, ArcGISMapView, ArcGISMapView2D, ArcGISMapViewController, type ArcGISMapViewInitOptions, type ArcGISMapViewProps, ArcGISMapViewStateInterface, ZoomAltitudeConverter, type ZoomAltitudeViewportSize, arcGISScaleToZoom, arcGISZoomToScale };
