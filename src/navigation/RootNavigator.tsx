import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/home/HomeScreen';
import { BusinessDetailScreen } from '../screens/business/BusinessDetailScreen';
import { BookingWizardScreen } from '../screens/booking/BookingWizardScreen';
import { MyAppointmentsScreen } from '../screens/appointments/MyAppointmentsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

// Owner Screens
import { OwnerAgendaScreen } from '../screens/owner/OwnerAgendaScreen';
import { OwnerServicesScreen } from '../screens/owner/OwnerServicesScreen';
import { OwnerSchedulesScreen } from '../screens/owner/OwnerSchedulesScreen';
import { OwnerBusinessScreen } from '../screens/owner/OwnerBusinessScreen';

import { useOwner } from '../context/OwnerContext';
import { Colors, Typography } from '../constants/theme';

export type RootStackParamList = {
  MainTabs: { screen?: keyof BottomTabParamList } | undefined;
  OwnerTabs: { screen?: keyof OwnerTabParamList } | undefined;
  BusinessDetail: { businessId: number };
  BookingWizard: {
    businessId: number;
    businessName?: string;
    businessAddress?: string;
    preselectedServiceId?: number;
  };
  Login: undefined;
  Register: undefined;
};

export type BottomTabParamList = {
  HomeTab: undefined;
  AppointmentsTab: undefined;
  ProfileTab: undefined;
};

export type OwnerTabParamList = {
  OwnerAgendaTab: undefined;
  OwnerServicesTab: undefined;
  OwnerSchedulesTab: undefined;
  OwnerBusinessTab: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();
const OwnerTab = createBottomTabNavigator<OwnerTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.semiBold,
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Explorar',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'storefront' : 'storefront-outline'}
              size={size - 1}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="AppointmentsTab"
        component={MyAppointmentsScreen}
        options={{
          tabBarLabel: 'Mis Turnos',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size - 1}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size - 1}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const OwnerTabNavigator = () => {
  return (
    <OwnerTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: Typography.sizes.xs,
          fontWeight: Typography.weights.semiBold,
        },
      }}
    >
      <OwnerTab.Screen
        name="OwnerAgendaTab"
        component={OwnerAgendaScreen}
        options={{
          tabBarLabel: 'Agenda',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size - 1}
              color={color}
            />
          ),
        }}
      />
      <OwnerTab.Screen
        name="OwnerServicesTab"
        component={OwnerServicesScreen}
        options={{
          tabBarLabel: 'Servicios',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'briefcase' : 'briefcase-outline'}
              size={size - 1}
              color={color}
            />
          ),
        }}
      />
      <OwnerTab.Screen
        name="OwnerSchedulesTab"
        component={OwnerSchedulesScreen}
        options={{
          tabBarLabel: 'Horarios',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              size={size - 1}
              color={color}
            />
          ),
        }}
      />
      <OwnerTab.Screen
        name="OwnerBusinessTab"
        component={OwnerBusinessScreen}
        options={{
          tabBarLabel: 'Mi Negocio',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'storefront' : 'storefront-outline'}
              size={size - 1}
              color={color}
            />
          ),
        }}
      />
    </OwnerTab.Navigator>
  );
};

export const RootNavigator = () => {
  const { isOwnerMode } = useOwner();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isOwnerMode ? (
          <Stack.Screen name="OwnerTabs" component={OwnerTabNavigator} />
        ) : (
          <Stack.Screen name="MainTabs" component={TabNavigator} />
        )}
        <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
        <Stack.Screen name="BookingWizard" component={BookingWizardScreen} />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
