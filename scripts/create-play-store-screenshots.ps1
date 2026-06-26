$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'release\play-store-screenshots'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null

$logoPath = Join-Path $root 'public\logo.png'
$logo = if (Test-Path $logoPath) { [System.Drawing.Image]::FromFile($logoPath) } else { $null }

function New-Canvas {
    $bmp = New-Object System.Drawing.Bitmap 1080, 1920
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    return @($bmp, $g)
}

function Dispose-Draw {
    param($items)
    foreach ($item in $items) {
        if ($null -ne $item) { $item.Dispose() }
    }
}

function Brush {
    param([string]$hex)
    return New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml($hex))
}

function PenC {
    param([string]$hex, [float]$width = 1)
    return New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml($hex)), $width
}

function FontF {
    param([float]$size, [System.Drawing.FontStyle]$style = [System.Drawing.FontStyle]::Regular)
    return [System.Drawing.Font]::new('Segoe UI', $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

function Draw-RoundedRect {
    param($g, [System.Drawing.RectangleF]$rect, [float]$radius, $brush, $pen = $null)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    if ($brush) { $g.FillPath($brush, $path) }
    if ($pen) { $g.DrawPath($pen, $path) }
    $path.Dispose()
}

function Draw-Text {
    param($g, [string]$text, [float]$x, [float]$y, [float]$w, [float]$h, $font, $brush, [string]$align = 'Near')
    $fmt = New-Object System.Drawing.StringFormat
    $fmt.Alignment = [System.Drawing.StringAlignment]::$align
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Near
    $fmt.Trimming = [System.Drawing.StringTrimming]::Word
    $g.DrawString($text, $font, $brush, (New-Object System.Drawing.RectangleF $x, $y, $w, $h), $fmt)
    $fmt.Dispose()
}

function Draw-Background {
    param($g)
    $rect = New-Object System.Drawing.Rectangle 0, 0, 1080, 1920
    $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.ColorTranslator]::FromHtml('#070913')), ([System.Drawing.ColorTranslator]::FromHtml('#160915')), 90
    $g.FillRectangle($bg, $rect)
    $bg.Dispose()
    $pink = Brush '#332035'
    $blue = Brush '#14283b'
    $g.FillEllipse($pink, -220, 90, 680, 680)
    $g.FillEllipse($blue, 620, 40, 560, 560)
    $g.FillEllipse($pink, 590, 1330, 620, 620)
    Dispose-Draw @($pink, $blue)
}

function Draw-StatusBar {
    param($g)
    $white = Brush '#f8fafc'
    $font = FontF 25 ([System.Drawing.FontStyle]::Bold)
    Draw-Text $g '9:41' 58 30 200 44 $font $white
    Draw-Text $g '4G  86%' 815 30 210 44 $font $white 'Far'
    Dispose-Draw @($white, $font)
}

function Draw-PhoneShell {
    param($g)
    $shadow = Brush '#000000'
    $frame = Brush '#0d1020'
    $line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#2a3149')), 2
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 42, 96, 996, 1728) 70 $shadow $null
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 54, 86, 972, 1748) 64 $frame $line
    Dispose-Draw @($shadow, $frame, $line)
}

function Draw-TopBrand {
    param($g, [string]$label)
    if ($logo) { $g.DrawImage($logo, 95, 136, 72, 72) }
    $white = Brush '#ffffff'
    $muted = Brush '#a6adbd'
    $brand = FontF 28 ([System.Drawing.FontStyle]::Bold)
    $small = FontF 20 ([System.Drawing.FontStyle]::Regular)
    Draw-Text $g 'The College Date' 182 142 430 42 $brand $white
    Draw-Text $g $label 182 184 500 32 $small $muted
    Dispose-Draw @($white, $muted, $brand, $small)
}

function Draw-Headline {
    param($g, [string]$title, [string]$subtitle)
    $white = Brush '#ffffff'
    $muted = Brush '#b8bdcc'
    $titleFont = FontF 66 ([System.Drawing.FontStyle]::Bold)
    $subFont = FontF 29
    Draw-Text $g $title 92 265 880 170 $titleFont $white
    Draw-Text $g $subtitle 96 430 850 95 $subFont $muted
    Dispose-Draw @($white, $muted, $titleFont, $subFont)
}

function Draw-Nav {
    param($g, [string]$active)
    $bar = Brush '#101424'
    $line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#242b41')), 1
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 110, 1656, 860, 118) 40 $bar $line
    $items = @('Match', 'Explore', 'Chat', 'Profile')
    $x = 144
    foreach ($item in $items) {
        $isActive = $item -eq $active
        $b = Brush ($(if ($isActive) { '#ff5a78' } else { '#cbd1dc' }))
        $f = FontF 24 ([System.Drawing.FontStyle]::Bold)
        Draw-Text $g $item $x 1696 170 45 $f $b 'Center'
        Dispose-Draw @($b, $f)
        $x += 196
    }
    Dispose-Draw @($bar, $line)
}

function Save-Shot {
    param($bmp, [string]$name)
    $path = Join-Path $outDir $name
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Screenshot-Welcome {
    $c = New-Canvas; $bmp = $c[0]; $g = $c[1]
    Draw-Background $g; Draw-StatusBar $g; Draw-PhoneShell $g; Draw-TopBrand $g 'Campus dating for students'
    Draw-Headline $g 'Meet students around your campus' 'Match, chat, and build real connections with a student-first dating app made for campus life.'
    if ($logo) { $g.DrawImage($logo, 270, 610, 540, 540) }
    $btn = Brush '#ff4b6e'; Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 175, 1280, 730, 96) 36 $btn $null
    $white = Brush '#ffffff'; $f = FontF 34 ([System.Drawing.FontStyle]::Bold); Draw-Text $g 'Start matching' 175 1302 730 60 $f $white 'Center'
    $muted = Brush '#adb5c5'; $sf = FontF 24; Draw-Text $g 'Verified profiles. Safer discovery. Built for Nigerian campus communities.' 155 1412 770 90 $sf $muted 'Center'
    Dispose-Draw @($btn, $white, $f, $muted, $sf, $g); Save-Shot $bmp '01-welcome-campus-dating.png'; $bmp.Dispose()
}

function Screenshot-Match {
    $c = New-Canvas; $bmp = $c[0]; $g = $c[1]
    Draw-Background $g; Draw-StatusBar $g; Draw-PhoneShell $g; Draw-TopBrand $g 'Match'
    Draw-Headline $g 'Swipe into your next campus connection' 'Discover people nearby, view profile details, and match when the vibe is mutual.'
    $card = Brush '#151927'; $line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#2b324b')), 2
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 135, 555, 810, 910) 46 $card $line
    $photoBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.Rectangle 160, 580, 760, 610), ([System.Drawing.ColorTranslator]::FromHtml('#f97393')), ([System.Drawing.ColorTranslator]::FromHtml('#6157ff')), 45
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 160, 580, 760, 610) 38 $photoBrush $null
    $white = Brush '#ffffff'; $muted = Brush '#d5d9e5'; $name = FontF 48 ([System.Drawing.FontStyle]::Bold); $body = FontF 28
    Draw-Text $g 'Amaka, 21' 190 1218 500 60 $name $white
    Draw-Text $g 'University of Lagos' 190 1285 520 45 $body $muted
    Draw-Text $g 'AI insight: Strong campus lifestyle match and shared interests.' 190 1350 650 80 (FontF 25) $muted
    $no = Brush '#202638'; $yes = Brush '#ff4b6e'
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 260, 1500, 160, 84) 38 $no $null
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 660, 1500, 160, 84) 38 $yes $null
    Draw-Text $g 'Pass' 260 1522 160 50 (FontF 27 ([System.Drawing.FontStyle]::Bold)) $white 'Center'
    Draw-Text $g 'Like' 660 1522 160 50 (FontF 27 ([System.Drawing.FontStyle]::Bold)) $white 'Center'
    Draw-Nav $g 'Match'
    Dispose-Draw @($card, $line, $photoBrush, $white, $muted, $name, $body, $no, $yes, $g); Save-Shot $bmp '02-match-discovery.png'; $bmp.Dispose()
}

function Screenshot-Chat {
    $c = New-Canvas; $bmp = $c[0]; $g = $c[1]
    Draw-Background $g; Draw-StatusBar $g; Draw-PhoneShell $g; Draw-TopBrand $g 'Chat'
    Draw-Headline $g 'Keep campus conversations flowing' 'Chat with your matches, send media, and use smart replies when you need a good opener.'
    $panel = Brush '#111625'; $line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#293049')), 2
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 95, 555, 890, 960) 42 $panel $line
    $white = Brush '#ffffff'; $muted = Brush '#aeb6c8'; $pink = Brush '#ff4b6e'; $bubble = Brush '#20283d'
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 155, 635, 520, 92) 28 $bubble $null
    Draw-Text $g 'Hey, are you going for faculty week?' 185 657 460 60 (FontF 25) $white
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 360, 770, 555, 96) 28 $pink $null
    Draw-Text $g 'Yes. We should meet after class.' 390 794 485 60 (FontF 25 ([System.Drawing.FontStyle]::Bold)) $white
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 155, 925, 620, 96) 28 $bubble $null
    Draw-Text $g 'That sounds good. What department?' 185 949 550 60 (FontF 25) $white
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 145, 1210, 790, 82) 28 (Brush '#171d2d') $line
    Draw-Text $g 'AI replies: Ask about campus hangout spots' 178 1232 720 50 (FontF 24 ([System.Drawing.FontStyle]::Bold)) $muted
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 145, 1394, 790, 74) 34 (Brush '#0b0f1b') $line
    Draw-Text $g 'Type a message...' 180 1414 500 44 (FontF 24) $muted
    Draw-Nav $g 'Chat'
    Dispose-Draw @($panel, $line, $white, $muted, $pink, $bubble, $g); Save-Shot $bmp '03-chat-smart-replies.png'; $bmp.Dispose()
}

function Screenshot-Premium {
    $c = New-Canvas; $bmp = $c[0]; $g = $c[1]
    Draw-Background $g; Draw-StatusBar $g; Draw-PhoneShell $g; Draw-TopBrand $g 'Premium'
    Draw-Headline $g 'Unlock more visibility and better matches' 'Premium gives students unlimited swipes, priority discovery, profile viewers, and stronger match insights.'
    $gold = Brush '#fbbf24'; $card = Brush '#151927'; $line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#403829')), 2
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 120, 570, 840, 820) 46 $card $line
    Draw-Text $g 'Premium Access' 165 635 760 70 (FontF 48 ([System.Drawing.FontStyle]::Bold)) (Brush '#ffffff') 'Center'
    Draw-Text $g 'Unlimited Swipes' 190 780 700 45 (FontF 31 ([System.Drawing.FontStyle]::Bold)) $gold
    Draw-Text $g 'See Profile Viewers' 190 875 700 45 (FontF 31 ([System.Drawing.FontStyle]::Bold)) $gold
    Draw-Text $g 'Priority Discovery' 190 970 700 45 (FontF 31 ([System.Drawing.FontStyle]::Bold)) $gold
    Draw-Text $g 'AI Match Insights' 190 1065 700 45 (FontF 31 ([System.Drawing.FontStyle]::Bold)) $gold
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 205, 1225, 670, 96) 36 $gold $null
    Draw-Text $g 'Upgrade with Google Play' 205 1248 670 55 (FontF 30 ([System.Drawing.FontStyle]::Bold)) (Brush '#111827') 'Center'
    Draw-Nav $g 'Profile'
    Dispose-Draw @($gold, $card, $line, $g); Save-Shot $bmp '04-premium-benefits.png'; $bmp.Dispose()
}

function Screenshot-Safety {
    $c = New-Canvas; $bmp = $c[0]; $g = $c[1]
    Draw-Background $g; Draw-StatusBar $g; Draw-PhoneShell $g; Draw-TopBrand $g 'Safety'
    Draw-Headline $g 'Built with student safety in mind' 'Control your profile, complete onboarding, manage settings, and use safety-focused discovery tools.'
    $card = Brush '#111625'; $line = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#2d3650')), 2
    $green = Brush '#22c55e'; $pink = Brush '#ff4b6e'; $white = Brush '#ffffff'; $muted = Brush '#b8c0d0'
    $y = 600
    $items = @(
        @('Profile controls', 'Edit photos, bio, interests, and campus details.'),
        @('Verified onboarding', 'Photos help keep discovery authentic.'),
        @('Privacy settings', 'Manage visibility, account, and support options.'),
        @('Report and support', 'Clear safety pages and support contact.')
    )
    foreach ($item in $items) {
        Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 130, $y, 820, 150) 32 $card $line
        $g.FillEllipse($green, 170, ($y + 42), 58, 58)
        Draw-Text $g $item[0] 255 ($y + 28) 620 42 (FontF 31 ([System.Drawing.FontStyle]::Bold)) $white
        Draw-Text $g $item[1] 255 ($y + 78) 620 54 (FontF 23) $muted
        $y += 185
    }
    Draw-RoundedRect $g (New-Object System.Drawing.RectangleF 170, 1410, 740, 86) 34 $pink $null
    Draw-Text $g 'Complete profile and start safely' 170 1432 740 50 (FontF 28 ([System.Drawing.FontStyle]::Bold)) $white 'Center'
    Draw-Nav $g 'Profile'
    Dispose-Draw @($card, $line, $green, $pink, $white, $muted, $g); Save-Shot $bmp '05-safety-profile-controls.png'; $bmp.Dispose()
}

Screenshot-Welcome
Screenshot-Match
Screenshot-Chat
Screenshot-Premium
Screenshot-Safety

if ($logo) { $logo.Dispose() }
Write-Host "Created screenshots in $outDir"
