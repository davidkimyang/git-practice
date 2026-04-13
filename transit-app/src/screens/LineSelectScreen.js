import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUBWAY_LINES } from '../data/subwayData';

export default function LineSelectScreen({ navigation }) {
  function handleLinePress(lineName) {
    navigation.navigate('StationSelect', { lineName, step: 'from' });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.guide}>탑승할 노선을 선택하세요</Text>

        <View style={styles.grid}>
          {Object.keys(SUBWAY_LINES).map((lineName) => {
            const line = SUBWAY_LINES[lineName];
            return (
              <TouchableOpacity
                key={lineName}
                style={[styles.lineCard, { backgroundColor: line.color }]}
                onPress={() => handleLinePress(lineName)}
                activeOpacity={0.8}
              >
                <Text style={styles.lineName}>{lineName}</Text>
                <Text style={styles.stationCount}>
                  {line.stations.length}개역
                </Text>
                {line.isCircular && (
                  <Text style={styles.circularBadge}>순환</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  guide: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
    marginBottom: 20,
    textAlign: 'center',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  lineCard: {
    width: '47%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    position: 'relative',
  },
  lineName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  stationCount: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 4,
  },
  circularBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    overflow: 'hidden',
  },
});
