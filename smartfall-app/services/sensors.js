import { Accelerometer, Gyroscope, Barometer } from 'expo-sensors';

export const subscribeSensors = ({ interval = 50, onAcceleration, onRotation, onPressure }) => {
  try {
    Accelerometer.setUpdateInterval(interval);
    Gyroscope.setUpdateInterval(interval);
    
    // Barometer may not be available on all devices
    let barometerAvailable = false;
    try {
      Barometer.setUpdateInterval(interval);
      barometerAvailable = true;
    } catch (err) {
      console.warn('Barometer not available:', err.message);
    }

    const accSub = Accelerometer.addListener((data) => {
      try {
        onAcceleration?.(data);
      } catch (err) {
        console.error('Error in acceleration callback:', err);
      }
    });
    
    const gyroSub = Gyroscope.addListener((data) => {
      try {
        onRotation?.(data);
      } catch (err) {
        console.error('Error in rotation callback:', err);
      }
    });

    let baroSub = null;
    if (barometerAvailable && onPressure) {
      try {
        baroSub = Barometer.addListener((data) => {
          try {
            onPressure?.(data);
          } catch (err) {
            console.error('Error in pressure callback:', err);
          }
        });
      } catch (err) {
        console.warn('Failed to add barometer listener:', err.message);
      }
    }

    return () => {
      try {
        accSub?.remove();
        gyroSub?.remove();
        baroSub?.remove();
      } catch (err) {
        console.error('Error removing sensor listeners:', err);
      }
    };
  } catch (err) {
    console.error('Error setting up sensors:', err);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

