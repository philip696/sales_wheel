import { router } from 'expo-router';

import { StyleSheet, Text, View } from 'react-native';



import { PrimaryButton } from '@/src/components/PrimaryButton';

import { ScreenContainer } from '@/src/components/ScreenContainer';

import { useAuth } from '@/src/features/auth/useAuth';



export default function SalesHomeScreen() {

const { profile, signOut } = useAuth();



return (

<ScreenContainer

title={`Hello, ${profile?.name ?? 'Sales'}`}

subtitle="Manage your store visits and rewards"

>

{/* Welcome Card */}

<View style={styles.welcomeCard}>

<View style={styles.welcomeIcon}>

<Text style={styles.welcomeEmoji}>👋</Text>

</View>



<View style={styles.welcomeContent}>

<Text style={styles.welcomeTitle}>

Ready for today's visits?

</Text>



<Text style={styles.welcomeText}>

Complete your store attendance to unlock the

reward wheel.

</Text>

</View>

</View>



{/* Attendance */}

<View style={styles.section}>

<Text style={styles.sectionTitle}>

STORE ATTENDANCE

</Text>



<View style={styles.card}>

<View style={styles.cardIcon}>

<Text style={styles.cardEmoji}>📍</Text>

</View>



<View style={styles.cardContent}>

<Text style={styles.cardTitle}>

Start Attendance

</Text>



<Text style={styles.cardText}>

Select your store, verify your GPS location,

and take a fresh photo.

</Text>

</View>



<PrimaryButton

title="SELECT STORE"

onPress={() =>

router.push('/(sales)/stores')

}

/>

</View>

</View>



{/* Rewards */}

<View style={styles.section}>

<Text style={styles.sectionTitle}>

REWARDS

</Text>



<View style={styles.rewardCard}>

<View style={styles.rewardIcon}>

<Text style={styles.rewardEmoji}>🎡</Text>

</View>



<View style={styles.rewardContent}>

<Text style={styles.rewardTitle}>

Spin the Wheel

</Text>



<Text style={styles.rewardText}>

Complete an approved attendance to unlock

your reward.

</Text>

</View>



<PrimaryButton

title="SPIN"

variant="secondary"

onPress={() =>

router.push('/(sales)/spin')

}

/>

</View>

</View>



{/* History */}

<View style={styles.historyCard}>

<View>

<Text style={styles.historyTitle}>

📋 Visit History

</Text>



<Text style={styles.historyText}>

View your previous attendance and rewards.

</Text>

</View>



<PrimaryButton

title="VIEW"

variant="secondary"

onPress={() =>

router.push('/(sales)/history')

}

/>

</View>



{/* Sign Out */}

<PrimaryButton

title="SIGN OUT"

variant="danger"

onPress={signOut}

style={styles.signOut}

/>



<Text style={styles.footer}>

Store attendance and rewards are securely

validated by the server.

</Text>

</ScreenContainer>

);

}



const styles = StyleSheet.create({

/* WELCOME */



welcomeCard: {

flexDirection: 'row',

alignItems: 'center',

backgroundColor: '#eff6ff',

borderWidth: 1,

borderColor: '#bfdbfe',

borderRadius: 17,

padding: 16,

marginBottom: 22,

},



welcomeIcon: {

width: 48,

height: 48,

borderRadius: 24,

backgroundColor: '#dbeafe',

alignItems: 'center',

justifyContent: 'center',

marginRight: 12,

},



welcomeEmoji: {

fontSize: 23,

},



welcomeContent: {

flex: 1,

},



welcomeTitle: {

fontSize: 14,

fontWeight: '900',

color: '#1e40af',

marginBottom: 4,

},



welcomeText: {

fontSize: 11,

color: '#64748b',

lineHeight: 16,

},



/* SECTIONS */



section: {

marginBottom: 18,

},



sectionTitle: {

fontSize: 10,

fontWeight: '900',

color: '#9ca3af',

letterSpacing: 1,

marginBottom: 8,

},



/* ATTENDANCE */



card: {

backgroundColor: '#ffffff',

borderWidth: 1,

borderColor: '#e5e7eb',

borderRadius: 17,

padding: 16,

},



cardIcon: {

width: 48,

height: 48,

borderRadius: 24,

backgroundColor: '#f1f5f9',

alignItems: 'center',

justifyContent: 'center',

marginBottom: 11,

},



cardEmoji: {

fontSize: 23,

},



cardContent: {

marginBottom: 13,

},



cardTitle: {

fontSize: 17,

fontWeight: '900',

color: '#111827',

marginBottom: 5,

},



cardText: {

fontSize: 11,

color: '#64748b',

lineHeight: 17,

},



/* REWARDS */



rewardCard: {

flexDirection: 'row',

alignItems: 'center',

backgroundColor: '#fffbeb',

borderWidth: 1,

borderColor: '#fde68a',

borderRadius: 17,

padding: 14,

},



rewardIcon: {

width: 46,

height: 46,

borderRadius: 23,

backgroundColor: '#fef3c7',

alignItems: 'center',

justifyContent: 'center',

marginRight: 11,

},



rewardEmoji: {

fontSize: 22,

},



rewardContent: {

flex: 1,

marginRight: 8,

},



rewardTitle: {

fontSize: 14,

fontWeight: '900',

color: '#92400e',

marginBottom: 3,

},



rewardText: {

fontSize: 10,

color: '#78716c',

lineHeight: 15,

},



/* HISTORY */



historyCard: {

flexDirection: 'row',

alignItems: 'center',

justifyContent: 'space-between',

backgroundColor: '#f8fafc',

borderWidth: 1,

borderColor: '#e2e8f0',

borderRadius: 15,

padding: 14,

marginBottom: 18,

},



historyTitle: {

fontSize: 13,

fontWeight: '800',

color: '#374151',

marginBottom: 3,

},



historyText: {

fontSize: 10,

color: '#94a3b8',

},



/* FOOTER */



signOut: {

marginBottom: 12,

},



footer: {

textAlign: 'center',

color: '#9ca3af',

fontSize: 9,

lineHeight: 14,

marginBottom: 10,

},

});

