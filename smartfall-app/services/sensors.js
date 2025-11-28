import { Accelerometer, Gyroscope } from 'expo-sensors';

export const subscribeSensors = ({ interval = 50, onAcceleration, onRotation }) => {
  try {
    Accelerometer.setUpdateInterval(interval);
    Gyroscope.setUpdateInterval(interval);

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

    return () => {
      try {
        accSub?.remove();
        gyroSub?.remove();
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

