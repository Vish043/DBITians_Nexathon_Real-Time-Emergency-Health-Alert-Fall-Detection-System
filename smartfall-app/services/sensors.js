import { Accelerometer, Gyroscope } from 'expo-sensors';

export const subscribeSensors = ({ interval = 50, onAcceleration, onRotation }) => {
  Accelerometer.setUpdateInterval(interval);
  Gyroscope.setUpdateInterval(interval);

  const accSub = Accelerometer.addListener((data) => onAcceleration?.(data));
  const gyroSub = Gyroscope.addListener((data) => onRotation?.(data));

  return () => {
    accSub && accSub.remove();
    gyroSub && gyroSub.remove();
  };
};

