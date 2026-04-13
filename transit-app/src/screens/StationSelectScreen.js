import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUBWAY_LINES } from '../data/subwayData';

export default function StationSelectScreen({ route, navigation }) {
  const { lineName, step, fromStation } = route.params;
  const line = SUBWAY_LINES[lineName];
  const [query, setQuery] = useState('');

  // 탑승역 선택 시에는 전체 역 목록
  // 하차역 선택 시에는 탑승역 제외 + 방향에 맞는 역만
  const stations = useMemo(() => {
    if (!line) return [];

    if (step === 'from') {
      return line.stations;
    }

    // 하차역: 탑승역 이후 역들만 표시 (양방향)
    const fromIdx = line.stations.indexOf(fromStation);
    if (fromIdx === -1) return line.stations.filter((s) => s !== fromStation);

    if (line.isCircular) {
      // 순환선: 탑승역 제외 전체
      return line.stations.filter((s) => s !== fromStation);
    }

    // 일반선: 앞/뒤 모두 선택 가능하되 탑승역 제외
    return line.stations.filter((s) => s !== fromStation);
  }, [line, step, fromStation]);

  const filtered = useMemo(
    () =>
      query.trim()
        ? stations.filter((s) => s.includes(query.trim()))
        : stations,
    [stations, query]
  );

  function handleSelect(stationName) {
    if (step === 'from') {
      // 탑승역 선택 완료 → 하차역 선택으로
      navigation.replace('StationSelect', {
        lineName,
        step: 'to',
        fromStation: stationName,
      });
    } else {
      // 하차역 선택 완료 → 모니터 화면으로
      const selectedRoute = { lineName, fromStation, toStation: stationName };
      navigation.navigate('Monitor', { route: selectedRoute });
    }
  }

  const isFrom = step === 'from';
  const fromIdx = line?.stations.indexOf(fromStation) ?? -1;

  function getStationHint(stationName) {
    if (!isFrom && fromIdx !== -1 && !line.isCircular) {
      const toIdx = line.stations.indexOf(stationName);
      const diff = Math.abs(toIdx - fromIdx);
      return `${diff}정거장`;
    }
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 헤더 정보 */}
      <View style={[styles.header, { backgroundColor: line?.color || '#1A56DB' }]}>
        <Text style={styles.headerLine}>{lineName}</Text>
        <Text style={styles.headerGuide}>
          {isFrom ? '탑승역을 선택하세요' : `하차역을 선택하세요`}
        </Text>
        {!isFrom && (
          <Text style={styles.headerFrom}>탑승역: {fromStation}</Text>
        )}
      </View>

      {/* 검색창 */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="역 이름 검색"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 역 목록 */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const hint = getStationHint(item);
          const originalIdx = line.stations.indexOf(item);

          return (
            <TouchableOpacity
              style={styles.stationItem}
              onPress={() => handleSelect(item)}
              activeOpacity={0.7}
            >
              <View style={styles.stationLeft}>
                <View style={[styles.dot, { backgroundColor: line?.color || '#888' }]} />
                <Text style={styles.stationName}>{item}</Text>
              </View>
              <View style={styles.stationRight}>
                {hint && (
                  <Text style={styles.stationHint}>{hint}</Text>
                )}
                <Text style={styles.stationNum}>{originalIdx + 1}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>'{query}'에 해당하는 역이 없습니다.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },

  // 상단 헤더
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerLine: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    opacity: 0.85,
  },
  headerGuide: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  headerFrom: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginTop: 4,
  },

  // 검색창
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222',
    paddingVertical: 0,
  },
  clearBtn: {
    fontSize: 14,
    color: '#aaa',
    paddingLeft: 8,
  },

  // 역 리스트
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 40,
  },
  stationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
  },
  stationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  stationName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222',
  },
  stationRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stationHint: {
    fontSize: 12,
    color: '#888',
  },
  stationNum: {
    fontSize: 12,
    color: '#ccc',
    width: 24,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 4,
  },

  emptyBox: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
  },
});
