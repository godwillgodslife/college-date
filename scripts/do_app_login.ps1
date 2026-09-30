$adb = "C:\Users\DELL\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$dev = "127.0.0.1:5557"
& $adb connect $dev
& $adb -s $dev wait-for-device

Write-Host "Tapping password field..."
& $adb -s $dev shell input tap 540 1020
Start-Sleep -Milliseconds 600

Write-Host "Entering password..."
& $adb -s $dev shell input text "CollegeDate2026%21VerifiedPass"
Start-Sleep -Milliseconds 600

Write-Host "Tapping Sign In button..."
& $adb -s $dev shell input tap 540 1310

Start-Sleep -Seconds 5

Write-Host "Capturing post-login screen..."
& $adb -s $dev shell screencap -p /sdcard/post_login.png
& $adb -s $dev pull /sdcard/post_login.png C:\Users\DELL\.gemini\antigravity\brain\a3d414a0-3923-40a1-bbc5-86db2aad6abf\post_login.png

Write-Host "DONE"
