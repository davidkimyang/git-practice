import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@transit_favorites';
const RECENT_KEY = '@transit_recent';
const MAX_RECENT = 5;

/**
 * 즐겨찾기 목록 불러오기
 * @returns {Promise<Array>}
 */
export async function getFavorites() {
  try {
    const json = await AsyncStorage.getItem(FAVORITES_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * 즐겨찾기 저장
 * @param {object} route - { lineName, fromStation, toStation, label }
 */
export async function saveFavorite(route) {
  const favorites = await getFavorites();
  const exists = favorites.some(
    (f) =>
      f.lineName === route.lineName &&
      f.fromStation === route.fromStation &&
      f.toStation === route.toStation
  );
  if (exists) return;

  const updated = [route, ...favorites];
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
}

/**
 * 즐겨찾기 삭제
 */
export async function removeFavorite(route) {
  const favorites = await getFavorites();
  const updated = favorites.filter(
    (f) =>
      !(
        f.lineName === route.lineName &&
        f.fromStation === route.fromStation &&
        f.toStation === route.toStation
      )
  );
  await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
}

/**
 * 최근 경로 불러오기
 */
export async function getRecent() {
  try {
    const json = await AsyncStorage.getItem(RECENT_KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
}

/**
 * 최근 경로 저장 (최대 5개 유지)
 */
export async function saveRecent(route) {
  const recent = await getRecent();
  const filtered = recent.filter(
    (r) =>
      !(
        r.lineName === route.lineName &&
        r.fromStation === route.fromStation &&
        r.toStation === route.toStation
      )
  );
  const updated = [route, ...filtered].slice(0, MAX_RECENT);
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
