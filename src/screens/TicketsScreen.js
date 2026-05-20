import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

export default function TicketsScreen({ isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const [activeTicket, setActiveTicket] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0); // seconds remaining

  // Camera permissions & scan state
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState(null); // { lot, basePrice }

  // Booking Form & Payment state
  const [vehicleNo, setVehicleNo] = useState('');
  const [duration, setDuration] = useState('1'); // hours
  const [calculatedFare, setCalculatedFare] = useState(0);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'qr', 'upi'

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Ticket History
  const [history, setHistory] = useState([
    {
      id: 't_hist_1',
      lot: 'Express Parking B',
      vehicle: 'NY-8890-MC',
      timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 2,
      cost: 5.00,
      status: 'expired'
    },
    {
      id: 't_hist_2',
      lot: 'Center Mall Park',
      vehicle: 'NY-8890-MC',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 3,
      cost: 7.50,
      status: 'expired'
    }
  ]);

  // Countdowns
  useEffect(() => {
    let interval = null;
    if (activeTicket && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setActiveTicket((curr) => curr ? { ...curr, status: 'expired' } : null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeTicket, timeLeft]);

  // Dynamic Fare calculation
  useEffect(() => {
    const hours = parseInt(duration) || 1;
    const base = scannedData ? scannedData.basePrice : 2.50;
    setCalculatedFare(hours * base);
  }, [duration, scannedData]);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    let lotName = "Main Street Lot A";
    let basePrice = 2.50;

    try {
      if (data && data.startsWith('{')) {
        const parsed = JSON.parse(data);
        lotName = parsed.lot || lotName;
        basePrice = parsed.price || basePrice;
      } else if (data) {
        lotName = data;
      }
    } catch (e) {
      if (data) lotName = data;
    }

    setScannedData({
      lot: lotName,
      basePrice: basePrice,
    });
    setShowPayment(true);
    Alert.alert("Scan Successful", `Parking Lot: ${lotName}`);
  };

  const handleUploadQR = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Denied", "Library access permission is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const mockLot = "Grand Central Deck";
        const mockPrice = 3.00;

        setScanned(true);
        setScannedData({
          lot: mockLot,
          basePrice: mockPrice,
        });
        setShowPayment(true);
        Alert.alert("QR Code Uploaded", `Ticket detected!\nParking Lot: ${mockLot}`);
      }
    } catch (error) {
      console.warn("Upload QR error:", error);
      Alert.alert("Upload Error", "Could not load image.");
    }
  };

  const handleSimulateScan = () => {
    const mockLot = "Metro Plaza Lot B";
    const mockPrice = 2.75;

    setScanned(true);
    setScannedData({
      lot: mockLot,
      basePrice: mockPrice,
    });
    setShowPayment(true);
  };

  const handlePaymentConfirm = () => {
    if (!vehicleNo.trim()) {
      Alert.alert("Input Required", "Please enter your vehicle number.");
      return;
    }

    const ticketId = `ticket_${Date.now()}`;
    const newTicket = {
      id: ticketId,
      lot: scannedData ? scannedData.lot : 'Main Street Lot A',
      vehicle: vehicleNo.toUpperCase(),
      duration: parseInt(duration),
      cost: calculatedFare,
      timestamp: new Date().toISOString(),
      status: 'active',
      expiresAt: new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString(),
    };

    setActiveTicket(newTicket);
    setTimeLeft(parseInt(duration) * 3600);
    setHistory([newTicket, ...history]);

    // Clear form states
    setVehicleNo('');
    setDuration('1');
    setScanned(false);
    setScannedData(null);
    setShowPayment(false);

    Alert.alert("Payment Successful", "Your parking ticket is now active!");
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const renderScanner = () => {
    if (!permission) {
      return (
        <View style={[styles.scannerPlaceholder, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      );
    }

    if (!permission.granted) {
      return (
        <View style={[styles.scannerPlaceholder, { backgroundColor: colors.surface, borderColor: colors.outlineVariant }]}>
          <FontAwesome6 name="camera" size={32} color={colors.outline} style={{ marginBottom: 12 }} />
          <Text style={[styles.placeholderTitle, { color: colors.onSurface }]}>Camera Access Required</Text>
          <Text style={[styles.placeholderSubText, { color: colors.onSurfaceVariant }]}>Enable camera scanning to read tickets</Text>
          
          <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
            <Text style={styles.permissionBtnText}>Enable Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.simulateBtn} onPress={handleSimulateScan}>
            <FontAwesome6 name="circle-play" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>Simulate Scan (Demo)</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={[styles.scannerWrapper, { borderColor: colors.outlineVariant }]}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        
        {/* Scanner Bounding Overlay */}
        <View style={styles.scannerOverlay}>
          <View style={[styles.scanTarget, { borderColor: colors.primary }]}>
            <View style={[styles.corner, styles.topLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: colors.primary }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: colors.primary }]} />
          </View>
        </View>

        {/* Floating Upload QR button at bottom right */}
        <TouchableOpacity 
          style={[styles.uploadFab, { backgroundColor: colors.primary }]} 
          onPress={handleUploadQR}
          activeOpacity={0.8}
        >
          <FontAwesome6 name="image" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>MotoReady</Text>
        <Text style={[styles.title, { color: colors.onSurface }]}>Book Parking Ticket</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Active Ticket Banner */}
        {activeTicket && activeTicket.status === 'active' && (
          <LinearGradient
            colors={['#1e3c72', '#2a5298']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.activeBanner, shadows.level2]}
          >
            <View style={styles.timerContainer}>
              <View style={[styles.timerRing, { borderColor: timeLeft < 300 ? colors.error : '#00E5B0' }]}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              </View>
            </View>
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle}>{activeTicket.lot}</Text>
              <Text style={styles.bannerSub}>{activeTicket.vehicle} • active ticket</Text>
              <View style={styles.badgeContainer}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Camera Scanner or Form Section */}
        {!showPayment ? (
          <View style={styles.sectionGroup}>
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Scan Ticket QR Code</Text>
            {renderScanner()}
            
            {/* If camera is allowed, we still show the option to simulate */}
            {permission && permission.granted && (
              <View style={styles.helperOptions}>
                <TouchableOpacity style={[styles.simulateTextBtn, { backgroundColor: colors.surfaceContainer }]} onPress={handleSimulateScan}>
                  <FontAwesome6 name="circle-play" size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ color: colors.onSurface, fontWeight: '600', fontSize: 13 }}>Simulate QR Scan (Web/Demo)</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.bookingCard, { backgroundColor: colors.surface }, shadows.level1]}>
            <View style={styles.scannedHeader}>
              <FontAwesome6 name="circle-check" size={24} color={colors.success} style={{ marginRight: 8 }} />
              <View>
                <Text style={[styles.scannedLotTitle, { color: colors.onSurface }]}>{scannedData?.lot}</Text>
                <Text style={[styles.scannedLotSub, { color: colors.onSurfaceVariant }]}>Scanned Parking Lot Info</Text>
              </View>
            </View>

            <Text style={[styles.label, { color: colors.onSurface }]}>Motorcycle Plate Number</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
              placeholder="e.g. NY-8890-MC"
              placeholderTextColor={`${colors.onSurfaceVariant}aa`}
              value={vehicleNo}
              onChangeText={setVehicleNo}
              autoCapitalize="characters"
            />

            <Text style={[styles.label, { color: colors.onSurface }]}>Parking Duration</Text>
            <View style={styles.durationRow}>
              {['1', '2', '4', '8'].map((hr) => (
                <TouchableOpacity
                  key={hr}
                  style={[
                    styles.durationBtn, 
                    { borderColor: colors.outline },
                    duration === hr && { backgroundColor: colors.primaryContainer, borderColor: colors.primary }
                  ]}
                  onPress={() => setDuration(hr)}
                >
                  <Text style={[
                    styles.durationBtnText, 
                    { color: colors.onSurfaceVariant },
                    duration === hr && { color: colors.onPrimaryContainer, fontWeight: '700' }
                  ]}>
                    {hr} hr{hr !== '1' && 's'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Price Info */}
            <View style={[styles.summaryCard, { backgroundColor: colors.surfaceContainerHigh }]}>
              <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Total Fare</Text>
              <Text style={[styles.summaryPrice, { color: colors.primary }]}>${calculatedFare.toFixed(2)}</Text>
            </View>

            <View style={styles.paymentSection}>
              <View style={styles.divider} />
              <Text style={[styles.label, { color: colors.onSurface, marginTop: 0, marginBottom: 12 }]}>Choose Online Payment</Text>
              
              {/* Payment Methods */}
              <View style={styles.methodSelector}>
                <TouchableOpacity 
                  style={[styles.methodBtn, paymentMethod === 'card' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <FontAwesome6 name="credit-card" size={15} color={paymentMethod === 'card' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.methodText, { color: paymentMethod === 'card' ? colors.primary : colors.onSurfaceVariant }]}>Card</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.methodBtn, paymentMethod === 'qr' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setPaymentMethod('qr')}
                >
                  <FontAwesome6 name="qrcode" size={15} color={paymentMethod === 'qr' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.methodText, { color: paymentMethod === 'qr' ? colors.primary : colors.onSurfaceVariant }]}>UPI QR</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.methodBtn, paymentMethod === 'upi' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <FontAwesome6 name="mobile-screen" size={15} color={paymentMethod === 'upi' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.methodText, { color: paymentMethod === 'upi' ? colors.primary : colors.onSurfaceVariant }]}>GPay/UPI</Text>
                </TouchableOpacity>
              </View>

              {/* Card Form */}
              {paymentMethod === 'card' && (
                <View style={styles.cardForm}>
                  <TextInput
                    style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
                    placeholder="Card Number"
                    keyboardType="numeric"
                    maxLength={16}
                    value={cardNumber}
                    onChangeText={setCardNumber}
                  />
                  <TextInput
                    style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
                    placeholder="Cardholder Name"
                    value={cardName}
                    onChangeText={setCardName}
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TextInput
                      style={[styles.input, { flex: 1, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
                      placeholder="MM/YY"
                      maxLength={5}
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
                      placeholder="CVV"
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={3}
                      value={cardCvv}
                      onChangeText={setCardCvv}
                    />
                  </View>
                </View>
              )}

              {/* UPI QR Code Pay */}
              {paymentMethod === 'qr' && (
                <View style={styles.qrInfoContainer}>
                  <Text style={[styles.qrInfoText, { color: colors.onSurfaceVariant }]}>
                    Scan to pay dynamically using any banking apps.
                  </Text>
                  <View style={[styles.qrCodeBox, { backgroundColor: colors.surfaceContainer }]}>
                    <FontAwesome6 name="qrcode" size={110} color={colors.onSurface} />
                  </View>
                  <Text style={[styles.qrTimer, { color: colors.error }]}>Code expires in 04:59</Text>
                </View>
              )}

              {/* UPI Direct Input */}
              {paymentMethod === 'upi' && (
                <View style={styles.upiContainer}>
                  <Text style={[styles.upiInfoText, { color: colors.onSurfaceVariant }]}>
                    Enter your Virtual Payment Address (VPA) or UPI ID.
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
                    placeholder="username@bank"
                    autoCapitalize="none"
                  />
                </View>
              )}

              {/* Confirm Pay Buttons */}
              <TouchableOpacity style={[styles.payConfirmBtn, { backgroundColor: colors.success }]} onPress={handlePaymentConfirm}>
                <Text style={styles.payConfirmBtnText}>Pay & Activate ${calculatedFare.toFixed(2)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowPayment(false); setScanned(false); setScannedData(null); }}>
                <Text style={{ color: colors.error, fontWeight: '700', textAlign: 'center' }}>Cancel Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Ticket History */}
        <Text style={[styles.sectionTitle, { color: colors.onSurface, marginTop: 24 }]}>Ticket History</Text>
        <View style={styles.historyList}>
          {history.map((t) => (
            <View key={t.id} style={[styles.historyCard, { backgroundColor: colors.surface }, shadows.level1]}>
              <View style={styles.historyCardHeader}>
                <Text style={[styles.historyLot, { color: colors.onSurface }]}>{t.lot}</Text>
                <View style={[
                  styles.statusBadge, 
                  { backgroundColor: t.status === 'active' ? colors.successContainer : colors.secondaryContainer }
                ]}>
                  <Text style={[
                    styles.statusBadgeText, 
                    { color: t.status === 'active' ? colors.onSuccessContainer : colors.onSecondaryContainer }
                  ]}>
                    {t.status}
                  </Text>
                </View>
              </View>
              <Text style={[styles.historyMeta, { color: colors.onSurfaceVariant }]}>
                {t.vehicle} • {t.duration} hr{t.duration > 1 && 's'}
              </Text>
              <View style={styles.historyCardFooter}>
                <Text style={[styles.historyTime, { color: colors.onSurfaceVariant }]}>
                  {new Date(t.timestamp).toLocaleDateString()}
                </Text>
                <Text style={[styles.historyCost, { color: colors.onSurface }]}>${t.cost.toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
    marginTop: Platform.OS === 'web' ? 12 : 0,
  },
  eyebrow: {
    fontSize: theme.typography.sizes.eyebrow,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: theme.typography.sizes.titleLarge,
    fontWeight: '800',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionGroup: {
    marginBottom: 16,
  },
  scannerPlaceholder: {
    height: 260,
    borderRadius: theme.shapes.large,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  placeholderSubText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  permissionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.shapes.full,
    marginBottom: 12,
  },
  permissionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  simulateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  scannerWrapper: {
    height: 260,
    borderRadius: theme.shapes.large,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanTarget: {
    width: 160,
    height: 160,
    borderWidth: 2,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    width: 20,
    height: 20,
    position: 'absolute',
    borderWidth: 3,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: -2,
    right: -2,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  uploadFab: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  helperOptions: {
    marginTop: 12,
    alignItems: 'center',
  },
  simulateTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.shapes.full,
  },
  bookingCard: {
    borderRadius: theme.shapes.large,
    padding: 16,
  },
  scannedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scannedLotTitle: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
  },
  scannedLotSub: {
    fontSize: 11,
    marginTop: 2,
  },
  label: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: theme.shapes.medium,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: theme.typography.fontFamily,
    marginBottom: 12,
  },
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  durationBtn: {
    flex: 1,
    height: 44,
    borderRadius: theme.shapes.medium,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBtnText: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '600',
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.shapes.medium,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '600',
  },
  summaryPrice: {
    fontSize: 22,
    fontWeight: '800',
  },
  paymentSection: {
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 16,
  },
  methodSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
  },
  cardForm: {
    gap: 4,
  },
  qrInfoContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  qrInfoText: {
    fontSize: theme.typography.sizes.bodySmall,
    textAlign: 'center',
    marginBottom: 12,
  },
  qrCodeBox: {
    padding: 16,
    borderRadius: theme.shapes.medium,
    marginBottom: 12,
  },
  qrTimer: {
    fontSize: theme.typography.sizes.bodySmall,
    fontWeight: '700',
  },
  upiContainer: {
    paddingVertical: 8,
  },
  upiInfoText: {
    fontSize: theme.typography.sizes.bodySmall,
    marginBottom: 12,
  },
  payConfirmBtn: {
    height: 52,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  payConfirmBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    marginTop: 8,
  },
  activeBanner: {
    borderRadius: theme.shapes.large,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 16,
  },
  timerContainer: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  bannerInfo: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '800',
    color: '#FFF',
  },
  bannerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  activeBadge: {
    backgroundColor: 'rgba(0, 200, 150, 0.2)',
    borderColor: '#00E5B0',
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.shapes.full,
  },
  activeBadgeText: {
    color: '#00E5B0',
    fontSize: 10,
    fontWeight: '700',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    padding: 14,
    borderRadius: theme.shapes.large,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyLot: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: theme.shapes.full,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  historyMeta: {
    fontSize: theme.typography.sizes.bodySmall,
    marginTop: 4,
  },
  historyCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  historyTime: {
    fontSize: 12,
  },
  historyCost: {
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
});
