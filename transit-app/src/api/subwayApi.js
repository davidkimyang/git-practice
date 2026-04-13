/**
 * 서울 열린데이터 광장 지하철 실시간 도착 정보 API
 *
 * API 키 발급: https://data.seoul.go.kr
 * 서비스명: 서울시 지하철 실시간 도착정보
 *
 * ⚠️ API_KEY를 발급받아 아래에 입력하세요.
 *    또는 환경변수(EXPO_PUBLIC_SUBWAY_API_KEY)로 설정할 수 있습니다.
 */

const API_KEY = process.env.EXPO_PUBLIC_SUBWAY_API_KEY || 'YOUR_API_KEY_HERE';
const BASE_URL = 'http://swopenapi.seoul.go.kr/api/subway';

// API 호출 결과 타입
// {
//   subwayId: '1002',           // 노선 코드
//   subwayNm: '2호선',           // 노선명
//   statnNm: '강남',             // 현재 역명
//   trainLineNm: '외선순환',      // 방향 (행선지)
//   arvlMsg2: '전역 출발',        // 도착 메시지
//   arvlMsg3: '삼성(선릉방면)',    // 다음역 정보
//   arvlCd: '3',                 // 도착코드 (0:진입,1:도착,2:출발,3:전역출발,4:전전역출발,99:운행중)
//   barvlDt: '120',              // 남은 시간(초)
//   recptnDt: '2024-01-01 ...',  // 수신 시간
// }

/**
 * 특정 역의 실시간 도착 정보 조회
 * @param {string} stationName - 역 이름 (예: '강남')
 * @returns {Promise<Array>} 도착 정보 배열
 */
export async function fetchArrivalInfo(stationName) {
  if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
    // API 키 미설정 시 목업 데이터 반환 (개발/테스트용)
    return getMockArrivalData(stationName);
  }

  try {
    const url = `${BASE_URL}/${API_KEY}/json/realtimeStationArrival/0/10/${encodeURIComponent(stationName)}`;
    const response = await fetch(url, { timeout: 10000 });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const json = await response.json();

    if (json.errorMessage && json.errorMessage.status !== 200) {
      throw new Error(json.errorMessage.message || 'API 오류');
    }

    return json.realtimeArrivalList || [];
  } catch (error) {
    console.error('지하철 API 오류:', error.message);
    throw error;
  }
}

/**
 * 도착 코드로 몇 정거장 전인지 파싱
 * @param {object} arrivalItem - API 응답 항목
 * @returns {number} 남은 정거장 수 (0=진입/도착, 1=1정거장전, 2=2정거장전, ...)
 */
export function parseRemainingStops(arrivalItem) {
  const { arvlCd, arvlMsg2 } = arrivalItem;

  // arvlCd 기반 판별
  if (arvlCd === '0' || arvlCd === '1') return 0; // 진입 or 도착
  if (arvlCd === '2') return 0;                    // 출발 (방금 지나침 - 거의 도착)
  if (arvlCd === '3') return 1;                    // 전역 출발 = 1정거장 전
  if (arvlCd === '4') return 2;                    // 전전역 출발 = 2정거장 전

  // arvlMsg2 텍스트 파싱으로 보완
  if (arvlMsg2) {
    if (arvlMsg2.includes('당역 도착') || arvlMsg2.includes('곧 도착')) return 0;
    const match = arvlMsg2.match(/(\d+)번째 전역/);
    if (match) return parseInt(match[1], 10);
    if (arvlMsg2.includes('전역 출발')) return 1;
  }

  return 99; // 파악 불가 (운행중 등)
}

/**
 * 도착 정보에서 남은 시간(초) 추출
 */
export function parseRemainingSeconds(arrivalItem) {
  const secs = parseInt(arrivalItem.barvlDt, 10);
  return isNaN(secs) ? null : secs;
}

// ─────────────────────────────────────────────
// 개발/테스트용 목업 데이터
// ─────────────────────────────────────────────

function getMockArrivalData(stationName) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          subwayId: '1002',
          subwayNm: '2호선',
          statnNm: stationName,
          trainLineNm: '외선순환 - 잠실',
          arvlMsg2: '전역 출발',
          arvlMsg3: `${stationName}(잠실방면)`,
          arvlCd: '3',
          barvlDt: '90',
          recptnDt: new Date().toISOString(),
          _isMock: true,
        },
        {
          subwayId: '1002',
          subwayNm: '2호선',
          statnNm: stationName,
          trainLineNm: '내선순환 - 신도림',
          arvlMsg2: '2번째 전역 출발',
          arvlMsg3: `${stationName}(신도림방면)`,
          arvlCd: '4',
          barvlDt: '180',
          recptnDt: new Date().toISOString(),
          _isMock: true,
        },
      ]);
    }, 500);
  });
}
