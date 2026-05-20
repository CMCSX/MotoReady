import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../styles/theme';

export default function TicketsScreen({ isDarkMode }) {
  const currentTheme = isDarkMode ? theme.dark : theme.light;
  const colors = currentTheme.colors;
  const shadows = currentTheme.shadows;

  const [activeTicket, setActiveTicket] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0); // seconds remaining

  // Booking Form State
  const [vehicleNo, setVehicleNo] = useState('');
  const [duration, setDuration] = useState('1'); // hours
  const [selectedLot, setSelectedLot] = useState('Main Street Lot A');
  const [calculatedFare, setCalculatedFare] = useState(0);
  const [showPayment, setShowPayment] = useState(false);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card', 'qr', 'upi'
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
      cost: 4.00,
      status: 'expired'
    },
    {
      id: 't_hist_2',
      lot: 'Center Mall Park',
      vehicle: 'NY-8890-MC',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration: 3,
      cost: 6.00,
      status: 'expired'
    }
  ]);

  // Handle countdown timer for active ticket
  useEffect(() => {
    let interval = null;
    if (activeTicket && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            // Expire ticket
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

  // Calculate fare dynamically
  useEffect(() => {
    const hours = parseInt(duration) || 1;
    setCalculatedFare(hours * 2.50); // $2.50 per hour
  }, [duration]);

  const handleBookingSubmit = () => {
    if (!vehicleNo.trim()) {
      Alert.alert("Input Required", "Please enter your motorcycle vehicle number.");
      return;
    }
    setShowPayment(true);
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const handlePaymentConfirm = () => {
    // Generate active ticket
    const ticketId = `ticket_${Date.now()}`;
    const newTicket = {
      id: ticketId,
      lot: selectedLot,
      vehicle: vehicleNo.toUpperCase(),
      duration: parseInt(duration),
      cost: calculatedFare,
      timestamp: new Date().toISOString(),
      status: 'active',
      expiresAt: new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString(),
    };

    setActiveTicket(newTicket);
    setTimeLeft(parseInt(duration) * 3600); // convert hours to seconds

    // Add to history list (prepend)
    setHistory([newTicket, ...history]);

    // Reset form states
    setVehicleNo('');
    setDuration('1');
    setShowPayment(false);
    
    Alert.alert("Payment Successful", "Your parking ticket is now active!");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Active Ticket Banner */}
        {activeTicket && activeTicket.status === 'active' && (
          <LinearGradient
            colors={['#1A237E', '#283593']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.activeBanner, shadows.level2]}
          >
            <View style={styles.timerContainer}>
              <View style={[styles.timerRing, { borderColor: timeLeft < 300 ? colors.error : '#FF8A50' }]}>
                <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
              </View>
            </View>
            <View style={styles.bannerInfo}>
              <Text style={styles.bannerTitle}>{activeTicket.lot}</Text>
              <Text style={styles.bannerSub}>{activeTicket.vehicle} • expires in {activeTicket.duration} hr</Text>
              <View style={styles.badgeContainer}>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        )}

        {/* Quick Booking Form */}
        <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Book Parking Ticket</Text>
        <View style={[styles.bookingCard, { backgroundColor: colors.surface }, shadows.level1]}>
          <Text style={[styles.label, { color: colors.onSurface }]}>Select Parking Lot</Text>
          <View style={[styles.selectBox, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer }]}>
            <TextInput
              style={{ color: colors.onSurface, padding: 12, fontSize: 16, fontFamily: theme.typography.fontFamily }}
              value={selectedLot}
              onChangeText={setSelectedLot}
              placeholder="Lot name…"
            />
          </View>

          <Text style={[styles.label, { color: colors.onSurface }]}>Vehicle Number Plate</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
            placeholder="e.g. NY-8890-MC"
            placeholderTextColor={`${colors.onSurfaceVariant}aa`}
            value={vehicleNo}
            onChangeText={setVehicleNo}
            autoCapitalize="characters"
          />

          <Text style={[styles.label, { color: colors.onSurface }]}>Duration (Hours)</Text>
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

          {/* Price Summary */}
          <View style={[styles.summaryCard, { backgroundColor: colors.surfaceContainerHigh }]}>
            <Text style={[styles.summaryLabel, { color: colors.onSurfaceVariant }]}>Total Cost</Text>
            <Text style={[styles.summaryPrice, { color: colors.primary }]}>${calculatedFare.toFixed(2)}</Text>
          </View>

          {!showPayment ? (
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: colors.primary }]} onPress={handleBookingSubmit}>
              <Text style={styles.primaryBtnText}>Proceed to Payment</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.paymentSection}>
              <View style={styles.divider} />
              
              {/* Payment Methods */}
              <View style={styles.methodSelector}>
                <TouchableOpacity 
                  style={[styles.methodBtn, paymentMethod === 'card' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <FontAwesome6 name="credit-card" size={16} color={paymentMethod === 'card' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.methodText, { color: paymentMethod === 'card' ? colors.primary : colors.onSurfaceVariant }]}>Card</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.methodBtn, paymentMethod === 'qr' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setPaymentMethod('qr')}
                >
                  <FontAwesome6 name="qrcode" size={16} color={paymentMethod === 'qr' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.methodText, { color: paymentMethod === 'qr' ? colors.primary : colors.onSurfaceVariant }]}>QR Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.methodBtn, paymentMethod === 'upi' && { borderBottomColor: colors.primary, borderBottomWidth: 3 }]}
                  onPress={() => setPaymentMethod('upi')}
                >
                  <FontAwesome6 name="mobile-screen" size={16} color={paymentMethod === 'upi' ? colors.primary : colors.onSurfaceVariant} />
                  <Text style={[styles.methodText, { color: paymentMethod === 'upi' ? colors.primary : colors.onSurfaceVariant }]}>UPI</Text>
                </TouchableOpacity>
              </View>

              {/* Card Payment Form */}
              {paymentMethod === 'card' && (
                <View style={styles.cardForm}>
                  {/* Card Preview Mockup */}
                  <LinearGradient
                    colors={['#1e3c72', '#2a5298']}
                    style={[styles.cardPreview, shadows.level2]}
                  >
                    <FontAwesome6 name="cc-visa" size={32} color="#FFF" style={styles.cardTypeIcon} />
                    <Text style={styles.previewCardNum}>
                      {cardNumber ? cardNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
                    </Text>
                    <View style={styles.cardPreviewBottom}>
                      <View>
                        <Text style={styles.previewLabel}>CARDHOLDER</Text>
                        <Text style={styles.previewValue}>{cardName.toUpperCase() || 'YOUR NAME'}</Text>
                      </View>
                      <View>
                        <Text style={styles.previewLabel}>EXPIRES</Text>
                        <Text style={styles.previewValue}>{cardExpiry || 'MM/YY'}</Text>
                      </View>
                    </View>
                  </LinearGradient>

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
                  <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
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

              {/* QR Code Mock */}
              {paymentMethod === 'qr' && (
                <View style={styles.qrContainer}>
                  <Text style={[styles.qrInfo, { color: colors.onSurfaceVariant }]}>
                    Scan the QR code below to complete payment via your banking app.
                  </Text>
                  <View style={[styles.qrBox, { backgroundColor: colors.surfaceContainer }]}>
                    <FontAwesome6 name="qrcode" size={120} color={colors.onSurface} />
                  </View>
                  <Text style={[styles.qrTimer, { color: colors.error }]}>QR Code expires in 4:59</Text>
                </View>
              )}

              {/* UPI Form */}
              {paymentMethod === 'upi' && (
                <View style={styles.upiContainer}>
                  <Text style={[styles.upiInfo, { color: colors.onSurfaceVariant }]}>
                    Enter your Virtual Payment Address (VPA) / UPI ID.
                  </Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.outlineVariant, color: colors.onSurface, backgroundColor: colors.surfaceContainer }]}
                    placeholder="username@bank"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <TouchableOpacity style={[styles.payConfirmBtn, { backgroundColor: colors.success }]} onPress={handlePaymentConfirm}>
                <Text style={styles.payConfirmBtnText}>Confirm & Pay ${calculatedFare.toFixed(2)}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPayment(false)}>
                <Text style={{ color: colors.error, fontWeight: '700', textAlign: 'center' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* History List */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 96,
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
  sectionTitle: {
    fontSize: theme.typography.sizes.titleMedium,
    fontWeight: '700',
    marginBottom: 16,
  },
  bookingCard: {
    borderRadius: theme.shapes.large,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: theme.typography.sizes.bodyMedium,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  selectBox: {
    borderWidth: 1,
    borderRadius: theme.shapes.medium,
    height: 48,
    justifyContent: 'center',
    marginBottom: 12,
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
  primaryBtn: {
    height: 52,
    borderRadius: theme.shapes.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: theme.typography.sizes.bodyLarge,
    fontWeight: '700',
  },
  paymentSection: {
    marginTop: 8,
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
    fontSize: 14,
    fontWeight: '600',
  },
  cardForm: {
    gap: 4,
  },
  cardPreview: {
    height: 170,
    borderRadius: theme.shapes.large,
    padding: 20,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  cardTypeIcon: {
    alignSelf: 'flex-end',
  },
  previewCardNum: {
    color: '#FFF',
    fontFamily: 'Courier New',
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: '700',
    marginVertical: 16,
  },
  cardPreviewBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  previewValue: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  qrInfo: {
    fontSize: theme.typography.sizes.bodySmall,
    textAlign: 'center',
    marginBottom: 12,
  },
  qrBox: {
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
  upiInfo: {
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
