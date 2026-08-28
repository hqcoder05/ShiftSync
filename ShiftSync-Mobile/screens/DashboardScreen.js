import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import avatar from '../assets/avatar-dilan-jon.png';
import availabilityIcon from '../assets/dangky.png';
import payrollIcon from '../assets/luong.png';
import requestIcon from '../assets/yeucau.png';
import scheduleIcon from '../assets/lichlam.png';
import dashboardIcon from '../assets/shync.png';
import calendarIcon from '../assets/Calendar.png';
import messageIcon from '../assets/icon_note.png';
import settingsIcon from '../assets/setting.png';
import { getMyShifts } from '../services/shiftService';
import { getMyPayslips } from '../services/payrollService';

const shifts = [
  ['6:00', '14:00', 'Ngày 3 tháng 8 năm 2026'],
  ['6:00', '15:00', 'Ngày 4 tháng 8 năm 2026'],
  ['14:00', '22:00', 'Ngày 4 tháng 8 năm 2026'],
];

const actions = [
  ['Đăng ký lịch làm', availabilityIcon, '#EAF8E6', 'Availability'],
  ['Phiếu lương', payrollIcon, '#FFF6DE', 'Payroll'],
  ['Yêu cầu', requestIcon, '#E7F7FA', 'Request'],
  ['Lịch làm', scheduleIcon, '#F7E8F0', 'Schedule'],
];

const nav = (navigation, destination) => {
  if (destination === 'Availability') navigation.getParent()?.navigate('Availability');
  else if (destination === 'Profile') navigation.getParent()?.navigate('Profile');
  else navigation.navigate(destination);
};

function ShiftRow({ item }) {
  return <View style={s.shiftRow}>
    <View style={s.shiftTime}><Text style={s.time}>{item[0]}<Text style={s.amPm}>AM</Text></Text><View style={s.timeDash}/><Text style={s.time}>{item[1]}<Text style={s.amPm}>PM</Text></Text></View>
    <View style={s.shiftInfo}><Text style={s.shiftDate}>{item[2]}</Text><Text style={s.address}>Highlands D9/71 Tây Thạnh Tân Phú</Text><View style={s.roleRow}><View style={s.dot}/><Text style={s.role}>Barista</Text></View></View>
  </View>;
}

export default function DashboardScreen({ navigation }) {
  const [assignedShifts, setAssignedShifts] = useState([]);
  const [latestPayslip, setLatestPayslip] = useState(null);
  const now = new Date();
  const todayText = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  useEffect(() => {
    getMyShifts().then((res) => setAssignedShifts(res.data || [])).catch(() => setAssignedShifts([]));
    getMyPayslips().then((res) => setLatestPayslip(res.data?.[0] || null)).catch(() => setLatestPayslip(null));
  }, []);
  const realShifts = useMemo(() => assignedShifts
    .filter((shift) => shift.shiftDate >= now.toISOString().slice(0, 10))
    .sort((a, b) => `${a.shiftDate}${a.startTime}`.localeCompare(`${b.shiftDate}${b.startTime}`)), [assignedShifts]);
  const todayShift = realShifts.find((shift) => shift.shiftDate === now.toISOString().slice(0, 10));
  const displayShifts = realShifts.slice(0, 3).map((shift) => [
    String(shift.startTime).slice(0, 5), String(shift.endTime).slice(0, 5),
    new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${shift.shiftDate}T00:00:00`)),
  ]);
  return <SafeAreaView style={s.safe}><StatusBar style="dark" />
    <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      <View style={s.hero}>
        <Image source={avatar} style={s.avatar}/>
        <Text style={s.today}>{todayText}</Text>
        <Text style={s.greeting}>Chào buổi sáng,{`\n`}Dilan. Jon .</Text>
        <Text style={s.headline}>{todayShift ? 'Hôm nay,\nbạn có một ca làm.' : 'Hôm nay,\nbạn chưa có ca làm.'}</Text>
        {todayShift && <View style={s.todayCard}><Text style={s.hours}>{String(todayShift.startTime).slice(0,5)} - {String(todayShift.endTime).slice(0,5)}</Text><View style={s.divider}/><View style={[s.roleRow, s.todayRole]}><View style={s.dot}/><Text style={s.role}>{todayShift.skillName || 'Ca làm việc'}</Text></View><Text style={s.todayAddress}>Ca được quản lý phân công</Text><Pressable onPress={() => nav(navigation, 'Attendance')} style={s.checkIn}><Text style={s.checkInText}>Check In</Text></Pressable></View>}
      </View>
      <View style={s.actionGrid}>{actions.map(([label, icon, color, screen]) => <Pressable key={label} onPress={() => nav(navigation, screen)} style={[s.action, {backgroundColor: color}]}><Image source={icon} style={s.actionIcon}/><Text style={s.actionText}>{label}</Text></Pressable>)}</View>
      <View style={s.sectionHeader}><Text style={s.sectionTitle}>Ca làm việc sắp tới của bạn</Text><Pressable onPress={() => nav(navigation, 'Schedule')}><Text style={s.link}>xem tất cả</Text></Pressable></View>
      <View style={s.shiftList}>{displayShifts.length ? displayShifts.map((item, i) => <ShiftRow key={i} item={item}/>) : <Text style={s.empty}>Chưa có ca làm việc sắp tới.</Text>}</View>
      <View style={s.income}><View style={s.incomeTop}><Text style={s.range}>{latestPayslip ? `${latestPayslip.periodStartDate} – ${latestPayslip.periodEndDate}` : 'Chưa có kỳ lương'}</Text><Pressable onPress={() => nav(navigation, 'Payroll')}><Text style={s.link}>xem tất cả</Text></Pressable></View><Text style={s.incomeTitle}>Báo cáo thu nhập{`\n`}của bạn</Text><Text style={s.label}>Lương thực nhận</Text><Text style={s.amount}>{latestPayslip ? `${Number(latestPayslip.totalAmount).toLocaleString('vi-VN')} VNĐ` : '—'}</Text><Text style={s.label}>Giờ đã làm việc</Text><Text style={s.stat}>{latestPayslip?.totalHours || 0} <Text style={s.statEnd}>giờ</Text></Text><Text style={s.label}>Tăng ca</Text><Text style={s.stat}>{latestPayslip?.otHours || 0} <Text style={s.statEnd}>giờ</Text></Text><Image source={payrollIcon} style={s.incomeArt}/></View>
    </ScrollView>
    <View style={s.navbar}>{[[dashboardIcon,'Dashboard'],[calendarIcon,'Schedule'],[messageIcon,'Request'],[settingsIcon,'Profile']].map(([icon, screen]) => <Pressable key={screen} style={s.navButton} onPress={() => nav(navigation, screen)}><Image source={icon} style={s.navIcon}/></Pressable>)}</View>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#fff'},content:{paddingBottom:105},hero:{padding:22,paddingTop:18,paddingBottom:21,backgroundColor:'#EAF8E6',borderBottomLeftRadius:22,borderBottomRightRadius:22},avatar:{width:66,height:66,borderRadius:33,borderWidth:1,borderColor:'#1E1E1E',backgroundColor:'#fff',marginBottom:19},today:{fontSize:18,color:'#383B3C',marginBottom:18},greeting:{fontSize:22,lineHeight:25,color:'#383B3C',marginBottom:28},headline:{fontSize:26,lineHeight:30,fontWeight:'700',color:'#383B3C',marginBottom:29},todayCard:{backgroundColor:'#fff',borderRadius:11,overflow:'hidden',paddingBottom:15,elevation:2,shadowColor:'#789',shadowOpacity:.13,shadowRadius:12,shadowOffset:{width:0,height:5}},hours:{paddingHorizontal:23,paddingTop:13,paddingBottom:8,fontSize:26,fontWeight:'700',color:'#383B3C'},amPm:{fontSize:14,fontWeight:'600'},divider:{height:2,backgroundColor:'#EAF8E6'},roleRow:{flexDirection:'row',alignItems:'center',gap:9},todayRole:{marginLeft:23,marginTop:9},dot:{height:15,width:15,borderRadius:8,backgroundColor:'#7CD8CE'},role:{fontSize:14,color:'#404345'},todayAddress:{marginLeft:23,marginTop:7,fontSize:12,color:'#5B6063'},checkIn:{alignSelf:'flex-start',marginLeft:23,marginTop:15,paddingHorizontal:25,paddingVertical:8,borderRadius:10,backgroundColor:'#EAF8E6'},checkInText:{fontSize:24,fontWeight:'700',color:'#383B3C'},actionGrid:{padding:11,paddingTop:30,gap:13,flexDirection:'row',flexWrap:'wrap'},action:{width:'48%',height:65,borderRadius:10,paddingHorizontal:12,alignItems:'center',flexDirection:'row',gap:10},actionIcon:{width:37,height:37,resizeMode:'contain'},actionText:{fontSize:14,color:'#3F4144',fontWeight:'500',flexShrink:1},sectionHeader:{marginHorizontal:25,marginTop:19,paddingTop:25,borderTopWidth:1,borderTopColor:'#E9E7E4',flexDirection:'row',alignItems:'center',justifyContent:'space-between'},sectionTitle:{fontSize:20,fontWeight:'700',color:'#383A3C'},link:{fontSize:13,fontWeight:'600',color:'#46A83A'},shiftList:{marginHorizontal:25,marginTop:14},empty:{paddingVertical:24,color:'#7B8490',fontSize:14},shiftRow:{flexDirection:'row',paddingVertical:14,borderBottomWidth:1,borderBottomColor:'#E9E7E4'},shiftTime:{width:91,borderRightWidth:1,borderRightColor:'#E8E5E1',alignItems:'center',justifyContent:'center'},time:{fontSize:19,lineHeight:22,fontWeight:'600',color:'#46A83A'},timeDash:{width:14,height:1,marginVertical:4,backgroundColor:'#46A83A'},shiftInfo:{flex:1,paddingLeft:17,justifyContent:'center'},shiftDate:{fontSize:14,fontWeight:'500',color:'#383A3C'},address:{fontSize:11,color:'#62676A',marginTop:5},income:{position:'relative',overflow:'hidden',margin:16,marginTop:24,padding:24,minHeight:350,borderRadius:10,backgroundColor:'#EAF8E6'},incomeTop:{flexDirection:'row',justifyContent:'space-between'},range:{fontSize:14,fontWeight:'500',color:'#404345'},incomeTitle:{fontSize:25,lineHeight:29,fontWeight:'700',color:'#131516',marginTop:17},label:{fontSize:16,color:'#45494A',marginTop:19},amount:{fontSize:31,color:'#46A83A',marginTop:7},stat:{fontSize:24,color:'#46A83A',marginTop:3},statEnd:{fontSize:15,color:'#45494A'},incomeArt:{position:'absolute',width:145,height:145,right:9,bottom:9,resizeMode:'contain'},navbar:{position:'absolute',height:65,bottom:18,left:26,right:26,borderRadius:21,backgroundColor:'#383838',flexDirection:'row',alignItems:'center',justifyContent:'space-around'},navButton:{width:45,alignItems:'center'},navIcon:{width:32,height:32,resizeMode:'contain',tintColor:'#fff'}
});
