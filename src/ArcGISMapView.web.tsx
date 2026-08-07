import { useEffect, useRef, useState } from 'react';
import { mapViewStateInternal } from '@mapconductor/js-sdk-core';
import '@arcgis/core/assets/esri/themes/light/main.css';
import Attribution from '@arcgis/core/widgets/Attribution';
import Zoom from '@arcgis/core/widgets/Zoom';
import {
  MapContext,
  MapViewScope,
  MapServiceRegistryProvider,
  MapViewScopeProvider,
  InfoBubbleOverlay,
  MarkerAnimationLayer,
  MapAttributionOverlay,
  type InfoBubbleEntry,
  createMapContextValue,
} from '@mapconductor/js-sdk-react';
import {
  useCameraRestriction,
  useMapUISettings,
  useMarkerRenderingSupport,
} from '@mapconductor/js-sdk-react/internal';
import type {
  MapCameraPosition,
  GeoPoint,
  OverlayCollector,
  MarkerAnimationOverlayEntry,
  MapViewControllerInterface,
} from '@mapconductor/js-sdk-core';
import type { ArcGISMapViewController } from './ArcGISMapViewController';
import type { ArcGISMapViewProps } from './ArcGISMapViewProps';
import { ArcGISMapProvider } from './ArcGISMapProvider';
import type { ArcGISConfig } from './ArcGISMapConfig';

const MISSING_API_KEY_MESSAGE =
  'ArcGIS API key is required. Set arcGISMapViewState.apiKey via useArcGISViewState({ apiKey }).';

const ARCGIS_VIEW_ROOT_STYLE_ID = 'mapconductor-arcgis-view-root-style';

function ensureArcGISViewRootStyle(): void {
  if (typeof document === 'undefined' || document.getElementById(ARCGIS_VIEW_ROOT_STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = ARCGIS_VIEW_ROOT_STYLE_ID;
  style.textContent = `
.esri-view .esri-view-root {
  flex: unset;
  height: 100%;
}
/*
  2D は tilt を「地図コンテナごと CSS で傾ける」方式で表現するため、view.ui の中にある
  Esri 標準 UI（ズーム・帰属表示）は一緒に潰れ、200% に広げたぶん画面外へも出てしまう。
  同じウィジェットを変換の外側へ別途マウントしているので、内側の既定 UI は隠す。
  （view.ui.components = [] / view.ui.remove() は既に生成済みのウィジェットを
  取り除いてくれないため、CSS で確実に消す。）
*/
.mapconductor-arcgis-2d-plane .esri-ui {
  display: none;
}
`;
  document.head.appendChild(style);
}

export function ArcGISMapView({
  state,
  className,
  style,
  markerTilingOptions,
  minZoom,
  maxZoom,
  restrictBounds,
  cameraRestriction,
  onError,
  onMapLoaded,
  onMapClick,
  onMapLongClick,
  onCameraMoveStart,
  onCameraMove,
  onCameraMoveEnd,
  children,
  useSceneView = true,
}: ArcGISMapViewProps & { useSceneView?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** 傾けた平面をクリップする外側コンテナ（可視範囲そのもの）。 */
  const outerRef = useRef<HTMLDivElement>(null);
  /** 変換の外側に置く Esri ウィジェットのマウント先（2D のみ使う）。 */
  const zoomNodeRef = useRef<HTMLDivElement>(null);
  const attributionNodeRef = useRef<HTMLDivElement>(null);
  const [provider] = useState(() => new ArcGISMapProvider());
  const [scope] = useState(() => new MapViewScope());
  const [controller, setController] = useState<MapViewControllerInterface | null>(null);
  const [isReady, setIsReady] = useState(false);
  // `onMapLoaded` と同じ瞬間を「値」として持つ。イベントを取り逃した後から
  // マウントした子（examples の Three.js overlay 等）も読めるようにするため。
  const [isLoaded, setIsLoaded] = useState(false);
  const bridgeUnsubs = useRef<(() => void)[]>([]);
  const typedControllerRef = useRef<ArcGISMapViewController | null>(null);
  const [bubbleEntries, setBubbleEntries] = useState<InfoBubbleEntry[]>([]);
  const [animationEntries, setAnimationEntries] = useState<MarkerAnimationOverlayEntry[]>([]);
  const [cameraTick, setCameraTick] = useState(0);
  // 2D `MapView` はカメラピッチを持てないので、地図コンテナ自体を CSS `rotateX` で傾けて
  // 遠近を作る（react-for-leaflet / react-for-openlayers と同じ方式）。負 tilt は
  // `ArcGIS2DTiltEmulation` が中心の前進で表現するので、描画角度は常に絶対値。
  const [visualTilt, setVisualTilt] = useState(0);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const missingApiKey = !state.apiKey?.trim();

  const onMapLoadedRef = useRef(onMapLoaded);
  const onMapClickRef = useRef(onMapClick);
  const onMapLongClickRef = useRef(onMapLongClick);
  const onCameraMoveStartRef = useRef(onCameraMoveStart);
  const onCameraMoveRef = useRef(onCameraMove);
  const onCameraMoveEndRef = useRef(onCameraMoveEnd);
  const onErrorRef = useRef(onError);
  onMapLoadedRef.current = onMapLoaded;
  onMapClickRef.current = onMapClick;
  onMapLongClickRef.current = onMapLongClick;
  onCameraMoveStartRef.current = onCameraMoveStart;
  onCameraMoveRef.current = onCameraMove;
  onCameraMoveEndRef.current = onCameraMoveEnd;
  onErrorRef.current = onError;

  useEffect(() => {
    ensureArcGISViewRootStyle();

    if (!containerRef.current) return;

    const resolvedApiKey = state.apiKey?.trim();
    if (!resolvedApiKey) {
      const error = new Error(MISSING_API_KEY_MESSAGE);
      setInitializationError(error);
      onErrorRef.current?.(error);
      return;
    }

    let cancelled = false;
    setInitializationError(null);

    const config: ArcGISConfig = {
      container: containerRef.current,
      initCameraPosition: state.cameraPosition,
      mapDesignType: state.mapDesignType,
      markerTilingOptions,
      apiKey: resolvedApiKey,
      useSceneView,
      minZoom,
      maxZoom,
      restrictBounds,
    };

    provider
      .initialize(config)
      .then((ctrl) => {
        if (cancelled) return;

        mapViewStateInternal(state).setController(ctrl);
        mapViewStateInternal(state).setCameraPositionChangeListener(() => {
          setCameraTick(t => t + 1);
        });
        setController(ctrl);
        typedControllerRef.current = ctrl as ArcGISMapViewController;
        (ctrl as ArcGISMapViewController).onVisualTiltChanged = (tilt) => setVisualTilt(tilt);

        ctrl.setCameraMoveStartListener((camera: MapCameraPosition) => {
          mapViewStateInternal(state).updateCameraPosition(camera);
          onCameraMoveStartRef.current?.(camera);
        });
        ctrl.setCameraMoveListener((camera: MapCameraPosition) => {
          mapViewStateInternal(state).updateCameraPosition(camera);
          onCameraMoveRef.current?.(camera);
          setCameraTick(t => t + 1);
        });
        ctrl.setCameraMoveEndListener((camera: MapCameraPosition) => {
          mapViewStateInternal(state).updateCameraPosition(camera);
          onCameraMoveEndRef.current?.(camera);
          setCameraTick(t => t + 1);
        });
        ctrl.setMapClickListener((point: GeoPoint) => onMapClickRef.current?.(point));
        ctrl.setMapLongClickListener((point: GeoPoint) => onMapLongClickRef.current?.(point));
        ctrl.setMapInitializedListener(() => {
          const initialCamera = typedControllerRef.current?.getCameraPosition() ?? null;
          // 地図が出来た時点の実カメラ（visibleRegion 込み）を state へ流し込む。
          if (initialCamera) mapViewStateInternal(state).updateCameraPosition(initialCamera);
          setIsLoaded(true);
          onMapLoadedRef.current?.(state);
          setCameraTick(t => t + 1);
        });

        const registry = scope.buildRegistry();
        for (const overlay of registry.getAll()) {
          const unsub = overlay.subscribe((data) => {
            overlay.render(data, ctrl).catch(console.error);
          });
          bridgeUnsubs.current.push(unsub);
        }

        const bubbleUnsub = scope.bubbleCollector.subscribe((map) => {
          setBubbleEntries(Array.from(map.values()));
        });
        bridgeUnsubs.current.push(bubbleUnsub);

        typedControllerRef.current.setMarkerAnimationOverlayHost(scope.markerAnimationStore.start);
        bridgeUnsubs.current.push(() => typedControllerRef.current?.setMarkerAnimationOverlayHost(null));
        const animationUnsub = scope.markerAnimationStore.subscribe(setAnimationEntries);
        bridgeUnsubs.current.push(animationUnsub);

        const c = ctrl as unknown as Record<string, (s: never) => unknown>;
        const setupUpdateHandler = <S extends { id: string }>(
          collector: OverlayCollector<S>,
          hasMethod: string,
          updateMethod: string,
          onUpdated?: () => void,
        ) => {
          collector.setUpdateHandler((state) => {
            if ((c[hasMethod] as (s: S) => boolean)?.(state)) {
              void (c[updateMethod] as (s: S) => Promise<void>)?.(state);
              onUpdated?.();
            }
          });
          bridgeUnsubs.current.push(() => collector.setUpdateHandler(null));
        };

        setupUpdateHandler(scope.markerCollector, 'hasMarker', 'updateMarker', () => setCameraTick(t => t + 1));
        setupUpdateHandler(scope.circleCollector, 'hasCircle', 'updateCircle');
        setupUpdateHandler(scope.polylineCollector, 'hasPolyline', 'updatePolyline');
        setupUpdateHandler(scope.polygonCollector, 'hasPolygon', 'updatePolygon');
        setupUpdateHandler(scope.groundImageCollector, 'hasGroundImage', 'updateGroundImage');
        setupUpdateHandler(scope.rasterLayerCollector, 'hasRasterLayer', 'updateRasterLayer');

        setIsReady(true);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to initialize ArcGIS:', error);
        const initializationError = error instanceof Error ? error : new Error(String(error));
        setInitializationError(initializationError);
        onErrorRef.current?.(initializationError);
      });

    return () => {
      cancelled = true;
      mapViewStateInternal(state).setCameraPositionChangeListener(null);
      mapViewStateInternal(state).setController(null);
      typedControllerRef.current = null;
      bridgeUnsubs.current.forEach((unsub) => unsub());
      bridgeUnsubs.current = [];
      provider.destroy();
    };
  }, [state.apiKey, state.mapDesignType.id, useSceneView]);

  void cameraTick;

  useMapUISettings(state, controller);
  // マップ生成時 config だけでなく、prop の変化にも追随させる（android-sdk 相当）。
  useCameraRestriction(controller, { cameraRestriction, restrictBounds, minZoom, maxZoom });


  // マーカー描画 capability をこのマップのサービスレジストリへ登録する。
  // marker-clustering などの拡張がここから解決する
  // （android-sdk の *MapView.kt / ios-sdk の *MapView.swift が
  //  MarkerRenderingSupportKey を put するのと同じ位置づけ）。
  useMarkerRenderingSupport(state, scope, controller);

  // 3D（SceneView）はカメラが実際に傾くので変換しない。2D のみ絶対値で傾ける。
  const tiltPlane = useSceneView ? 0 : Math.min(Math.abs(visualTilt), 60);

  // Esri 標準の UI（ズーム・帰属表示）は `view.ui` = 地図コンテナの中に置かれるため、
  // そのままだと傾けた平面と一緒に潰れ、200% に広がったぶん画面外へも出てしまう。
  //
  // DOM ごと外へ移すと React の再レンダリングでウィジェットが失われるので、`view.ui` は
  // 空にしたうえで、同じウィジェットを**変換の外側のコンテナへ直接マウント**し直す
  // （`container` を指定する Esri 公式の使い方）。見た目と挙動はそのままに、傾きの
  // 影響だけを外せる。帰属表示は Esri の利用条件で必須なので必ず出す。
  useEffect(() => {
    const view = typedControllerRef.current?.holder.map;
    if (!view || view.type !== '2d' || !isReady) return;
    const zoomNode = zoomNodeRef.current;
    const attributionNode = attributionNodeRef.current;
    if (!zoomNode || !attributionNode) return;

    // `view.ui.components` は view の読み込み完了時に既定値へ戻されるため、
    // 即時と `when()` の両方で空にする（片方だけだと既定のズーム・帰属表示が残り、
    // 傾けた平面の中で潰れたまま二重に表示される）。
    const zoom = new Zoom({ view, container: zoomNode });
    const attribution = new Attribution({ view, container: attributionNode });
    return () => {
      zoom.destroy();
      attribution.destroy();
    };
  }, [isReady]);

  return (
    <MapContext.Provider value={createMapContextValue({ controller, isReady, isLoaded, state })}>
      <>
        {/*
          回した平面が元のフレームを覆うよう 200%（= 1 / cos(60°)）に広げてから回し、
          外側のコンテナでクリップする。遠近（CSS `perspective`）は掛けない — 正射影なら
          回した後の高さが `2 * cos(60°) = 1.0` でちょうど収まる。3D（SceneView）は
          カメラが実際に傾くので変換しない。
        */}
        <div
          ref={outerRef}
          className={className}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            ...style,
          }}
        >
          <div
            ref={containerRef}
            className={useSceneView ? undefined : 'mapconductor-arcgis-2d-plane'}
            style={
              tiltPlane
                ? {
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: '200%',
                    height: '200%',
                    transform: `translate(-50%, -50%) rotateX(${tiltPlane}deg)`,
                    transformOrigin: '50% 50%',
                    transformStyle: 'flat',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                  }
                : { position: 'absolute', inset: 0 }
            }
          />
          {/*
            変換の外側に置く Esri ウィジェット（2D のみ）。`view.ui` の既定位置と同じく
            ズームは左上、帰属表示は下端に置く。3D では `view.ui` の既定 UI をそのまま使う
            ので、このノードは空のまま。
          */}
          {!useSceneView && (
            <>
              <div
                ref={zoomNodeRef}
                style={{ position: 'absolute', top: 15, left: 15, zIndex: 2 }}
              />
              <div
                ref={attributionNodeRef}
                style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2 }}
              />
            </>
          )}
        </div>
        {(missingApiKey || initializationError) && (
          <div
            role="alert"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 24,
              boxSizing: 'border-box',
              background: '#fff',
              color: '#b91c1c',
              fontFamily: 'sans-serif',
              textAlign: 'center',
            }}
          >
            {missingApiKey ? MISSING_API_KEY_MESSAGE : initializationError?.message}
          </div>
        )}
        <MapAttributionOverlay
          scope={scope}
          camera={state.cameraPosition}
          designAttributionRules={state.mapDesignType.attributionRules}
        />
        {animationEntries.length > 0 && typedControllerRef.current && (
          <MarkerAnimationLayer
            entries={animationEntries}
            resolveScreenOffset={(entry) => typedControllerRef.current!.holder.toScreenOffset(entry.state.position)}
          />
        )}
        {bubbleEntries.length > 0 && typedControllerRef.current && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {bubbleEntries.map(entry => {
              const holder = typedControllerRef.current!.holder;
              const pos = entry.positionProvider();
              const screenOffset = holder.toScreenOffset(pos);
              if (!screenOffset) return null;
              const icon = entry.icon;
              const iconPixelSize = icon ? icon.iconSize * icon.scale : 0;
              return (
                <InfoBubbleOverlay
                  key={entry.id}
                  positionOffset={screenOffset}
                  iconSize={{ width: iconPixelSize, height: iconPixelSize }}
                  iconOffset={icon ? icon.anchor : { x: 0.5, y: 0.5 }}
                  infoAnchorOffset={icon ? icon.infoAnchor : { x: 0.5, y: 0.5 }}
                  tailOffset={entry.tailOffset}
                  style={{ pointerEvents: 'auto' }}
                >
                  {entry.content}
                </InfoBubbleOverlay>
              );
            })}
            </div>
          )}
      </>
      <MapServiceRegistryProvider registry={state.serviceRegistry}>
        <MapViewScopeProvider scope={scope}>
          {children}
        </MapViewScopeProvider>
      </MapServiceRegistryProvider>
    </MapContext.Provider>
  );
}

export function ArcGISMapView2D(props: ArcGISMapViewProps) {
  return <ArcGISMapView {...props} useSceneView={false} />;
}
