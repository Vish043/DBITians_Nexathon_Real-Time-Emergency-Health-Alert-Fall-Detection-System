# PowerShell script to start Expo with the correct API URL
$env:EXPO_PUBLIC_API_URL = "http://192.168.14.65:4000"
Write-Host "Starting Expo with API URL: $env:EXPO_PUBLIC_API_URL" -ForegroundColor Green
npx expo start -c

