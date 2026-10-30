// src/features/professionalArea/AgendaCalendar.tsx
// Calendario mensal da agenda do profissional (sem biblioteca externa).
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../constants/colors';

export interface CalendarEntry {
  date: string; // YYYY-MM-DD
  status: string;
}

interface Props {
  entries: CalendarEntry[];
  year: number;
  month: number; // 0 a 11
  onChangeMonth: (year: number, month: number) => void;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  today: string;
  blockedDates?: string[];
  showLegend?: boolean;
  offDates?: string[];
  statusColors: Record<string, string>;
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEK_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const STATUS_ORDER = ['scheduled', 'confirmed', 'completed', 'no_show', 'cancelled'];
const LEGEND: { key: string; label: string }[] = [
  { key: 'scheduled', label: 'A confirmar' },
  { key: 'confirmed', label: 'Confirmado' },
  { key: 'completed', label: 'Concluído' },
  { key: 'cancelled', label: 'Cancelado' },
];

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
export const ymd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

const AgendaCalendar: React.FC<Props> = ({
  entries,
  year,
  month,
  onChangeMonth,
  selectedDate,
  onSelectDate,
  today,
  blockedDates = [],
  showLegend = true,
  offDates = [],
  statusColors,
}) => {
  const byDate = useMemo(() => {
    const map: Record<string, { count: number; statuses: string[] }> = {};
    entries.forEach((e) => {
      if (!e.date) {
        return;
      }
      if (!map[e.date]) {
        map[e.date] = { count: 0, statuses: [] };
      }
      const slot = map[e.date];
      if (e.status !== 'cancelled') {
        slot.count += 1;
      }
      if (!slot.statuses.includes(e.status)) {
        slot.statuses.push(e.status);
      }
    });
    Object.keys(map).forEach((k) => {
      map[k].statuses.sort((a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b));
    });
    return map;
  }, [entries]);

  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);
  const off = useMemo(() => new Set(offDates), [offDates]);

  const weeks = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(d);
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month]);

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  };

  const [todayY, todayM] = today.split('-').map((n) => parseInt(n, 10));
  const showTodayButton = selectedDate !== today || todayY !== year || todayM - 1 !== month;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.arrow} onPress={() => go(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity style={styles.arrow} onPress={() => go(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="chevron-right" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {showTodayButton ? (
        <TouchableOpacity
          style={styles.todayButton}
          onPress={() => {
            onChangeMonth(todayY, todayM - 1);
            onSelectDate(today);
          }}
        >
          <Text style={styles.todayButtonText}>Ir para hoje</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.row}>
        {WEEK_HEADERS.map((w, i) => (
          <Text key={`h${i}`} style={styles.weekHeader}>{w}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={`w${wi}`} style={styles.row}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={`e${wi}-${di}`} style={styles.cell} />;
            }
            const date = ymd(year, month, day);
            const info = byDate[date];
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const isBlocked = blocked.has(date);
            const isOff = !isBlocked && off.has(date);
            const isPast = date < today;
            return (
              <TouchableOpacity
                key={date}
                style={styles.cell}
                activeOpacity={0.6}
                onPress={() => onSelectDate(date)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    isToday && styles.todayCircle,
                    isSelected && styles.selectedCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isPast && styles.pastText,
                      isOff && styles.offText,
                      isBlocked && styles.blockedText,
                      isSelected && styles.selectedText,
                    ]}
                  >
                    {day}
                  </Text>
                  {info && info.count > 0 ? (
                    <View style={[styles.countBadge, isSelected && styles.countBadgeSelected]}>
                      <Text style={[styles.countText, isSelected && styles.countTextSelected]}>
                        {info.count}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.dotsRow}>
                  {(info ? info.statuses.slice(0, 4) : []).map((s) => (
                    <View
                      key={s}
                      style={[styles.dot, { backgroundColor: statusColors[s] || colors.lightText }]}
                    />
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      {showLegend ? (
      <View style={styles.legend}>
        {LEGEND.map((l) => (
          <View key={l.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: statusColors[l.key] || colors.lightText }]} />
            <Text style={styles.legendText}>{l.label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <Text style={[styles.legendText, styles.offText]}>12</Text>
          <Text style={styles.legendText}> Folga</Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={[styles.legendText, styles.blockedText]}>12</Text>
          <Text style={styles.legendText}> Bloqueado</Text>
        </View>
      </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow: { padding: 4 },
  monthTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text },
  todayButton: { alignSelf: 'center', marginTop: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: colors.primary },
  todayButtonText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row' },
  weekHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.lightText, marginTop: 10, marginBottom: 4 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4, minHeight: 54 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { borderWidth: 2, borderColor: colors.primary },
  selectedCircle: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  pastText: { color: colors.lightText },
  offText: { color: colors.lightText, opacity: 0.45 },
  blockedText: { color: colors.lightText, textDecorationLine: 'line-through' },
  selectedText: { color: colors.white, fontWeight: 'bold' },
  countBadge: { position: 'absolute', top: -4, right: -6, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  countBadgeSelected: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.primary },
  countText: { fontSize: 10, color: colors.white, fontWeight: 'bold' },
  countTextSelected: { color: colors.primary },
  dotsRow: { flexDirection: 'row', marginTop: 3, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, marginHorizontal: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 6, marginTop: 4 },
  legendText: { fontSize: 11, color: colors.lightText, marginLeft: 3 },
});

export default AgendaCalendar;
