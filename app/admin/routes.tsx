import { ScreenContainer } from '@/src/components/ScreenContainer';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

type Filter = 'today' | 'week' | 'month';
type Sale = { id: string; name: string; code: string; role: string };
type Visit = { id: string; salesId: string; date: string; time: string; store: string; order: boolean; duration: number; distance: number };
type RoutePoint = { id: string; label: string; time: string; type: 'start' | 'store' | 'long' | 'end'; duration?: number };

const TODAY = '2026-08-26';
const WEEK = ['2026-08-20','2026-08-21','2026-08-22','2026-08-23','2026-08-24','2026-08-25','2026-08-26'];

const SALES: Sale[] = [
  { id: 'michael', name: 'Michael Tan', code: 'S001', role: 'Sales' },
  { id: 'budi', name: 'Budi Santoso', code: 'S002', role: 'Sales' },
  { id: 'andi', name: 'Andi Wijaya', code: 'S003', role: 'Sales' },
];

function makeWeek(salesId: string, stores: string[], baseLat = 0): Visit[] {
  const rows: Visit[] = [];
  WEEK.forEach((date, dayIndex) => {
    const count = 3 + ((dayIndex + salesId.length) % 3);
    for (let i = 0; i < count; i++) {
      const store = stores[(dayIndex * 2 + i) % stores.length];
      rows.push({
        id: `${salesId}-${date}-${i}`,
        salesId,
        date,
        time: `${String(8 + Math.floor((i * 47) / 60)).padStart(2, '0')}:${String((5 + i * 13) % 60).padStart(2, '0')}`,
        store,
        order: (i + dayIndex) % 3 !== 1,
        duration: i === 2 && dayIndex % 2 === 0 ? 145 : 28 + ((i * 7 + dayIndex) % 21),
        distance: i === 0 ? 0 : 2.4 + ((i * 1.3 + dayIndex) % 3.8),
      });
    }
  });
  return rows;
}

const VISITS: Visit[] = [
  ...makeWeek('michael', ['Big Stationary - Central','Toko Makmur','Sumber Rejeki','Kopi Tengah Kota','Maju Jaya','Sentosa Mart']),
  ...makeWeek('budi', ['Prima Stationery','Mitra Usaha','Berkah Mart','Coffee Point','Jaya Mandiri','Sukses Makmur']),
  ...makeWeek('andi', ['Karya Jaya','Anugerah Store','Cahaya Mart','Kopi Sudut Kota','Surya Store','Mitra Dagang']),
];

function d(date: string) { return new Date(`${date}T12:00:00`); }
function fmtDate(date: string) { return d(date).toLocaleDateString('en-US',{weekday:'long',day:'numeric',month:'short',year:'numeric'}); }
function dayName(date: string) { return d(date).toLocaleDateString('en-US',{weekday:'short'}); }
function dayNum(date: string) { return d(date).toLocaleDateString('en-US',{day:'numeric'}); }
function monthName(date: string) { return d(date).toLocaleDateString('en-US',{month:'short'}); }
function duration(m: number) { if (m < 60) return `${m} min`; const h = Math.floor(m/60); const r = m%60; return r ? `${h}h ${r}m` : `${h}h`; }
function visitsFor(salesId: string, date: string) { return VISITS.filter(v => v.salesId === salesId && v.date === date); }
function sumDistance(v: Visit[]) { return v.reduce((s,x)=>s+x.distance,0); }
function routeFor(salesId: string, date: string): RoutePoint[] {
  const v = visitsFor(salesId,date);
  return [
    { id:`${date}-s`, label:'Start Shift', time:'08:00', type:'start' },
    ...v.map(x => ({ id:x.id, label:x.store, time:x.time, type: x.duration >= 90 ? 'long' as const : 'store' as const, duration:x.duration })),
    { id:`${date}-e`, label:'End Shift', time:date === TODAY ? '17:05' : '17:00', type:'end' },
  ];
}

export default function AdminRoutesScreen() {
  const [filter,setFilter] = useState<Filter>('today');
  const [salesId,setSalesId] = useState('michael');
  const [date,setDate] = useState(TODAY);
  const selectedSales = SALES.find(s=>s.id===salesId) ?? SALES[0];
  const filtered = useMemo(() => {
    if (filter === 'today') return visitsFor(salesId,TODAY);
    if (filter === 'week') return VISITS.filter(v=>v.salesId===salesId && WEEK.includes(v.date));
    return VISITS.filter(v=>v.salesId===salesId);
  }, [filter,salesId]);
  const selectedDay = visitsFor(salesId,date);
  const orders = filtered.filter(v=>v.order).length;
  const stores = new Set(filtered.map(v=>v.store)).size;
  const distance = sumDistance(filtered);
  const rate = filtered.length ? Math.round((orders/filtered.length)*100) : 0;

  return (
    <ScreenContainer title="Sales Routes" subtitle="Monitor each salesperson's daily route">
      <FlatList
        data={filter === 'month' ? [] : selectedDay}
        keyExtractor={item=>item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.filterCard}>
              <Text style={styles.overline}>SALESPERSON</Text>
              <View style={styles.salesRow}>
                {SALES.map(s => (
                  <Pressable key={s.id} onPress={()=>{setSalesId(s.id);setDate(TODAY)}} style={[styles.salesChip,salesId===s.id&&styles.salesChipActive]}>
                    <Text style={[styles.salesName,salesId===s.id&&styles.salesNameActive]}>{s.name}</Text>
                    <Text style={[styles.salesCode,salesId===s.id&&styles.salesCodeActive]}>{s.code}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterCard}>
              <Text style={styles.overline}>PERIOD</Text>
              <View style={styles.filterRow}>
                {(['today','week','month'] as Filter[]).map(f => (
                  <Pressable key={f} onPress={()=>{setFilter(f); if(f!=='month') setDate(TODAY)}} style={[styles.filterButton,filter===f&&styles.filterButtonActive]}>
                    <Text style={[styles.filterText,filter===f&&styles.filterTextActive]}>{f==='today'?'TODAY':f==='week'?'1 WEEK':'1 MONTH'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.hero}>
              <View>
                <Text style={styles.heroEyebrow}>ROUTE MONITORING</Text>
                <Text style={styles.heroTitle}>{selectedSales.name}</Text>
                <Text style={styles.heroText}>{selectedSales.code} • {selectedSales.role}</Text>
              </View>
              <View style={styles.live}><View style={styles.liveDot}/><Text style={styles.liveText}>DEMO</Text></View>
            </View>

            <View style={styles.metrics}>
              <Metric value={orders} label="ORDERS" />
              <Metric value={stores} label="STORES" />
              <Metric value={filtered.length} label="VISITS" />
              <Metric value={`${rate}%`} label="ORDER RATE" />
            </View>

            {filter === 'week' ? (
              <View style={styles.dayCard}>
                <Text style={styles.overline}>SELECT A DAY TO VIEW ROUTE</Text>
                <View style={styles.days}>
                  {WEEK.map(day => (
                    <Pressable key={day} onPress={()=>setDate(day)} style={[styles.dayButton,date===day&&styles.dayButtonActive]}>
                      <Text style={[styles.dayName,date===day&&styles.dayTextActive]}>{dayName(day)}</Text>
                      <Text style={[styles.dayNumber,date===day&&styles.dayTextActive]}>{dayNum(day)}</Text>
                      <Text style={[styles.dayMonth,date===day&&styles.dayTextActive]}>{monthName(day)}</Text>
                      <Text style={[styles.dayMeta,date===day&&styles.dayTextActive]}>{visitsFor(salesId,day).length} visits</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {filter === 'month' ? (
              <View style={styles.monthCard}>
                <Text style={styles.overline}>LAST 30 DAYS</Text>
                {[...new Set(VISITS.filter(v=>v.salesId===salesId).map(v=>v.date))].sort().reverse().map(day => {
                  const rows = visitsFor(salesId,day);
                  const o = rows.filter(v=>v.order).length;
                  return <View key={day} style={styles.monthRow}><View><Text style={styles.monthDay}>{dayName(day)} {dayNum(day)} {monthName(day)}</Text><Text style={styles.monthSub}>{rows.length} visits • {o} orders • {sumDistance(rows).toFixed(1)} km</Text></View><Text style={styles.arrow}>→</Text></View>;
                })}
              </View>
            ) : null}

            {filter !== 'month' ? (
              <View style={styles.routeCard}>
                <View style={styles.routeHeader}><View><Text style={styles.overline}>DAILY ROUTE</Text><Text style={styles.routeTitle}>{date===TODAY?'Today':fmtDate(date)}</Text></View><Text style={styles.km}>{sumDistance(selectedDay).toFixed(1)} KM</Text></View>
                {routeFor(salesId,date).map((p,i)=><RouteItem key={p.id} point={p} last={i===routeFor(salesId,date).length-1}/>)}
              </View>
            ) : null}

            {filter !== 'month' ? <Text style={styles.listTitle}>{selectedDay.length} VISITS • {date===TODAY?'TODAY':fmtDate(date)}</Text> : null}
          </>
        }
        renderItem={({item})=><VisitRow visit={item}/>} 
      />
    </ScreenContainer>
  );
}

function Metric({value,label}:{value:string|number;label:string}) { return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }
function RouteItem({point,last}:{point:RoutePoint;last:boolean}) { const long=point.type==='long'; const edge=point.type==='start'||point.type==='end'; return <View style={styles.routeItem}><View style={styles.timeline}><View style={[styles.dot,long&&styles.longDot,edge&&styles.edgeDot]}/>{!last&&<View style={styles.line}/>}</View><View style={styles.routeInfo}><View style={styles.routeTop}><View style={styles.routeName}><Text style={styles.routePoint}>{point.label}</Text>{long&&<Text style={styles.longBadge}>LONG STAY</Text>}</View><Text style={styles.time}>{point.time}</Text></View>{point.duration&&<Text style={styles.duration}>Stayed {duration(point.duration)}</Text>}</View></View>; }
function VisitRow({visit}:{visit:Visit}) { return <View style={styles.visit}><View style={styles.visitTop}><View style={styles.icon}><Text>🏪</Text></View><View style={styles.visitMain}><Text style={styles.store}>{visit.store}</Text><Text style={styles.visitDate}>{fmtDate(visit.date)} • {visit.time}</Text></View><View style={[styles.badge,visit.order?styles.badgeYes:styles.badgeNo]}><Text style={[styles.badgeText,visit.order?styles.badgeTextYes:styles.badgeTextNo]}>{visit.order?'ORDER':'NO ORDER'}</Text></View></View><View style={styles.divider}/><View style={styles.statRow}><Text style={styles.statText}>DURATION {duration(visit.duration)}</Text><Text style={styles.statText}>{visit.distance.toFixed(1)} km</Text><Text style={styles.statText}>GPS VERIFIED</Text></View></View>; }

const styles=StyleSheet.create({
  content:{paddingBottom:32},
  filterCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:18,padding:12,marginBottom:12},
  overline:{fontSize:8,fontWeight:'900',color:'#94a3b8',letterSpacing:1.2,marginBottom:8},
  salesRow:{flexDirection:'row',gap:7},salesChip:{flex:1,minHeight:54,borderRadius:12,backgroundColor:'#f8fafc',borderWidth:1,borderColor:'#e2e8f0',padding:8},salesChipActive:{backgroundColor:'#111827',borderColor:'#111827'},salesName:{fontSize:9,fontWeight:'900',color:'#334155'},salesNameActive:{color:'#fff'},salesCode:{fontSize:7,color:'#94a3b8',marginTop:2},salesCodeActive:{color:'#93c5fd'},
  filterRow:{flexDirection:'row',gap:7},filterButton:{flex:1,minHeight:38,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:'#f1f5f9',borderWidth:1,borderColor:'#e2e8f0'},filterButtonActive:{backgroundColor:'#2563eb',borderColor:'#2563eb'},filterText:{fontSize:8,fontWeight:'900',color:'#64748b'},filterTextActive:{color:'#fff'},
  hero:{backgroundColor:'#111827',borderRadius:20,padding:17,marginBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},heroEyebrow:{fontSize:8,fontWeight:'900',color:'#60a5fa',letterSpacing:1.2,marginBottom:4},heroTitle:{fontSize:20,fontWeight:'900',color:'#fff'},heroText:{fontSize:9,color:'#94a3b8',marginTop:3},live:{flexDirection:'row',alignItems:'center',paddingHorizontal:8,paddingVertical:5,borderRadius:999,backgroundColor:'#1e293b'},liveDot:{width:6,height:6,borderRadius:3,backgroundColor:'#34d399',marginRight:5},liveText:{fontSize:7,fontWeight:'900',color:'#86efac'},
  metrics:{flexDirection:'row',gap:8,marginBottom:14},metric:{flex:1,minHeight:72,backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:15,padding:10,justifyContent:'center'},metricValue:{fontSize:20,fontWeight:'900',color:'#111827'},metricLabel:{fontSize:7,fontWeight:'800',color:'#94a3b8',marginTop:3},
  dayCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:18,padding:12,marginBottom:14},days:{flexDirection:'row',flexWrap:'wrap',gap:6},dayButton:{width:'31%',minHeight:78,borderRadius:12,borderWidth:1,borderColor:'#e2e8f0',backgroundColor:'#f8fafc',padding:8},dayButtonActive:{backgroundColor:'#111827',borderColor:'#111827'},dayName:{fontSize:7.5,fontWeight:'900',color:'#64748b'},dayNumber:{fontSize:18,fontWeight:'900',color:'#111827',marginTop:1},dayMonth:{fontSize:7,color:'#94a3b8'},dayMeta:{fontSize:7,fontWeight:'800',color:'#475569',marginTop:5},dayTextActive:{color:'#fff'},
  monthCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:18,padding:14,marginBottom:14},monthRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',paddingVertical:11,borderTopWidth:1,borderTopColor:'#f1f5f9'},monthDay:{fontSize:10,fontWeight:'900',color:'#1e293b'},monthSub:{fontSize:8,color:'#94a3b8',marginTop:3},arrow:{fontSize:17,color:'#94a3b8',fontWeight:'800'},
  routeCard:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:18,padding:15,marginBottom:15},routeHeader:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:14},routeTitle:{fontSize:16,fontWeight:'900',color:'#111827'},km:{fontSize:8,fontWeight:'900',color:'#2563eb',backgroundColor:'#eff6ff',paddingHorizontal:8,paddingVertical:5,borderRadius:999},routeItem:{flexDirection:'row',minHeight:52},timeline:{width:23,alignItems:'center'},dot:{width:10,height:10,borderRadius:5,backgroundColor:'#2563eb',marginTop:4,zIndex:2},longDot:{width:13,height:13,borderRadius:7,backgroundColor:'#f59e0b',borderWidth:2,borderColor:'#fef3c7'},edgeDot:{backgroundColor:'#111827'},line:{position:'absolute',top:13,bottom:-3,width:2,backgroundColor:'#dbeafe'},routeInfo:{flex:1,paddingLeft:8,paddingBottom:12},routeTop:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start'},routeName:{flex:1,paddingRight:8},routePoint:{fontSize:10.5,fontWeight:'800',color:'#1e293b'},time:{fontSize:9.5,fontWeight:'900',color:'#64748b'},duration:{fontSize:8,color:'#94a3b8',marginTop:2},longBadge:{alignSelf:'flex-start',fontSize:6.5,fontWeight:'900',color:'#b45309',backgroundColor:'#fffbeb',paddingHorizontal:6,paddingVertical:3,borderRadius:999,marginTop:3},
  listTitle:{fontSize:8.5,fontWeight:'900',color:'#94a3b8',letterSpacing:1.2,marginBottom:8},visit:{backgroundColor:'#fff',borderWidth:1,borderColor:'#e2e8f0',borderRadius:16,padding:13,marginBottom:9},visitTop:{flexDirection:'row',alignItems:'center'},icon:{width:38,height:38,borderRadius:11,backgroundColor:'#f1f5f9',alignItems:'center',justifyContent:'center',marginRight:9},visitMain:{flex:1},store:{fontSize:11,fontWeight:'900',color:'#111827'},visitDate:{fontSize:8,color:'#94a3b8',marginTop:2},badge:{borderRadius:999,paddingHorizontal:7,paddingVertical:5},badgeYes:{backgroundColor:'#dcfce7'},badgeNo:{backgroundColor:'#f1f5f9'},badgeText:{fontSize:6.8,fontWeight:'900'},badgeTextYes:{color:'#15803d'},badgeTextNo:{color:'#64748b'},divider:{height:1,backgroundColor:'#f1f5f9',marginVertical:10},statRow:{flexDirection:'row',justifyContent:'space-between'},statText:{fontSize:7,fontWeight:'800',color:'#64748b'},
});