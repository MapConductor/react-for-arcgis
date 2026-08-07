import {
  AbstractZoomAltitudeConverter,
  computeOffset,
  createGeoPoint,
  type GeoPoint,
  type GeoPointInterface,
} from '@mapconductor/js-sdk-core';
import { ZoomAltitudeConverter } from './zoom';

/**
 * ArcGIS の 2D `MapView` 向けの tilt 擬似表現。
 *
 * 2D `MapView` は中心 + 縮尺 + 回転だけでカメラピッチを持てない。3D の `SceneView` は
 * `camera.tilt` で実際に傾けられるが、2D では遠近感を作れないため、
 *
 * - 見た目の傾きは `ArcGISMapView` が地図コンテナを CSS `rotateX` で傾けて作る
 *   （react-for-leaflet / react-for-openlayers と同じ方式）
 * - ここが受け持つのは**カメラ位置の付け替え**だけ
 *
 * になっている。
 *
 * - tilt >= 0: 指定位置は**ターゲット**（画面中心）でカメラが後方へ下がるだけなので、
 *   中心もズームも変えない。傾きは見た目の変換だけで表現される。
 * - tilt < 0: 指定位置は**カメラ位置**で、ターゲットが進行方向（bearing）へ前進する。
 *   前進量とズームオフセットは MapLibre / TomTom / Leaflet / ios-for-arcgis /
 *   android-for-arcgis と同一の式・同一定数。
 */

/** MapLibre / TomTom / Leaflet と同一値。プロバイダ間で挙動を揃えるため変えないこと。 */
const TARGET_DISTANCE_SCALE = 1.83;
const ZOOM_OFFSET_AT_MAX_TILT = -0.9;
const MAX_TILT_DEGREES = 60;

/**
 * 高度の算出にはプラットフォーム非依存の既定値（Google Maps 較正）を使う。
 *
 * `ZoomAltitudeConverter` の既定値（ARCGIS_OPTIMIZED_ZOOM0_ALTITUDE）は **3D SceneView の
 * 実効画角**を合わせるための較正値で、画角を持たない 2D MapView には当てはまらない。
 * 既定値を使うことでシフト量が ios-sdk / android-sdk と厳密に一致する。
 */
const converter = new ZoomAltitudeConverter(AbstractZoomAltitudeConverter.DEFAULT_ZOOM0_ALTITUDE);

const clampTilt = (tilt: number): number => Math.min(Math.max(Math.abs(tilt), 0), MAX_TILT_DEGREES);

/** 実際に `view.goTo` へ渡す中心・ズーム。tilt >= 0 は入力のまま。 */
export function shiftedCamera(
  position: GeoPointInterface,
  zoom: number,
  bearing: number,
  tilt: number,
): { center: GeoPoint | GeoPointInterface; zoom: number } {
  if (tilt >= 0) return { center: position, zoom };

  const tiltAbsDeg = clampTilt(tilt);
  const tiltRadians = (tiltAbsDeg * Math.PI) / 180;
  const altitude = converter.zoomLevelToAltitude({
    zoomLevel: zoom,
    latitude: position.latitude,
    tilt: 0,
  });
  const distance = altitude * Math.cos(tiltRadians) * Math.tan(tiltRadians) * TARGET_DISTANCE_SCALE;
  const target = computeOffset({
    origin: createGeoPoint({ latitude: position.latitude, longitude: position.longitude }),
    distance,
    heading: bearing,
  });
  return {
    center: target,
    zoom: zoom + ZOOM_OFFSET_AT_MAX_TILT * (tiltAbsDeg / MAX_TILT_DEGREES),
  };
}

/**
 * {@link shiftedCamera} の逆変換。tilt < 0 のときだけ中心とズームを巻き戻す。
 *
 * @param logicalTilt 直近に要求した論理 tilt。
 * @param bearing 前進に使った方位。
 */
export function restoreLogicalCamera(
  center: GeoPointInterface,
  zoom: number,
  bearing: number,
  logicalTilt: number,
): { position: GeoPoint | GeoPointInterface; zoom: number } {
  const tiltAbsDeg = clampTilt(logicalTilt);
  if (logicalTilt >= 0 || tiltAbsDeg === 0) return { position: center, zoom };

  const tiltRadians = (tiltAbsDeg * Math.PI) / 180;
  const originalZoom = zoom - ZOOM_OFFSET_AT_MAX_TILT * (tiltAbsDeg / MAX_TILT_DEGREES);
  const altitude = converter.zoomLevelToAltitude({
    zoomLevel: originalZoom,
    latitude: center.latitude,
    tilt: 0,
  });
  const distance = altitude * Math.cos(tiltRadians) * Math.tan(tiltRadians) * TARGET_DISTANCE_SCALE;
  const origin = computeOffset({
    origin: createGeoPoint({ latitude: center.latitude, longitude: center.longitude }),
    distance,
    heading: bearing + 180,
  });
  return { position: origin, zoom: originalZoom };
}

/**
 * マーカーのアイコンを縦へ引き伸ばす倍率。
 *
 * 地図コンテナを CSS `rotateX` で傾けると中身が縦に `cos(tilt)` 倍へ潰れる。マーカーだけは
 * 立って見えてほしいので、先に `1 / cos(tilt)` 倍しておいて潰された後に元の高さになるようにする。
 */
export function markerVerticalStretch(tilt: number): number {
  const tiltRadians = (clampTilt(tilt) * Math.PI) / 180;
  return 1 / Math.max(Math.cos(tiltRadians), 0.5);
}

/** 見た目の傾きに使う角度（度）。負 tilt は中心の前進で表現するので常に絶対値。 */
export const visualTiltDegrees = clampTilt;
