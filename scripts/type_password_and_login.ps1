$adb = "C:\Users\DELL\AppData\Local\Android\Sdk\platform-tools\adb.exe"
$dev = "127.0.0.1:5557"
& $adb connect $dev
& $adb -s $dev wait-for-device

Write-Host "Clearing existing password..."
# Select all and delete
& $adb -s $dev shell input keyevent 29 --meta 113
Start-Sleep -Milliseconds 200
& $adb -s $dev shell input keyevent 67
Start-Sleep -Milliseconds 200

Write-Host "Typing CollegeDate2026..."
& $adb -s $dev shell input text "CollegeDate2026"
Start-Sleep -Milliseconds 200

Write-Host "Typing exclamation mark (!)..."
& $adb -s $dev shell input keyevent 8 --meta 1
Start-Sleep -Milliseconds 200

Write-Host "Typing VerifiedPass..."
& $adb -s $dev shell input text "VerifiedPass"
Start-Sleep -Milliseconds 400

Write-Host "Hiding keyboard..."
& $adb -s $dev shell input keyevent 111
Start-Sleep -Milliseconds 400

Write-Host "Tapping Sign In button..."
& $adb -s $dev shell input tap 540 705

Start-Sleep -Seconds 5

Write-Host "Capturing post-login screen..."
& $adb -s $dev shell screencap -p /sdcard/login_result.png
& $adb -s $dev pull /sdcard/login_result.png C:\Users\DELL\.gemini\antigravity\brain\a3d414a0-3923-40a1-bbc5-86db2aad6abf\login_result.png

Write-Host "COMPLETE"
