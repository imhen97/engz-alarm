import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import AlarmEditScreen from '../screens/AlarmEditScreen';
import RingingScreen from '../screens/RingingScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NightInputScreen from '../screens/NightInputScreen';
import StreakScreen from '../screens/StreakScreen';
import LevelTestScreen from '../screens/LevelTestScreen';
import ReviewQuizScreen from '../screens/ReviewQuizScreen';
import SentenceQuizScreen from '../screens/SentenceQuizScreen';
import PetScreen from '../screens/PetScreen';
import ShopScreen from '../screens/ShopScreen';
import { RootStackParamList } from './types';
import { navigationRef } from './navigationRef';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface Props {
  initialRoute?: keyof RootStackParamList;
}

export default function AppNavigator({ initialRoute = 'Home' }: Props) {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#FFF8F0' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="AlarmEdit"
          component={AlarmEditScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="Ringing"
          component={RingingScreen}
          options={{
            animation: 'fade',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="NightInput"
          component={NightInputScreen}
          options={{ animation: 'fade' }}
        />
        <Stack.Screen name="Streak" component={StreakScreen} />
        <Stack.Screen name="Pet" component={PetScreen} />
        <Stack.Screen name="Shop" component={ShopScreen} />
        <Stack.Screen
          name="LevelTest"
          component={LevelTestScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="ReviewQuiz"
          component={ReviewQuizScreen}
          options={{ animation: 'fade', gestureEnabled: false }}
        />
        <Stack.Screen
          name="SentenceQuiz"
          component={SentenceQuizScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
