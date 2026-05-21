# PowerShell script to generate Scrabble IL Android & Web Icons from the uploaded image.
# Uses standard .NET System.Drawing classes.

Add-Type -AssemblyName System.Drawing

param (
    [string]$sourcePath = "C:\Users\elaza\.gemini\antigravity\brain\9c0b038f-d661-4475-996f-1d2f9a358cd2\media__1779376366834.jpg"
)

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found at $sourcePath"
    exit 1
}

function Resize-Image {
    param (
        [string]$srcPath,
        [string]$outPath,
        [int]$w,
        [int]$h
    )
    Write-Host "Generating: $outPath ($w x $h)"
    
    # Create parent folder if not exists
    $parent = Split-Path $outPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    
    $srcImg = [System.Drawing.Image]::FromFile($srcPath)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    
    # High-quality settings
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($srcImg, 0, 0, $w, $h)
    
    # Save as PNG
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Dispose resources
    $g.Dispose()
    $bmp.Dispose()
    $srcImg.Dispose()
}

$projectRoot = "C:\Users\elaza\.gemini\antigravity\scratch\HebrewScrabble"

# --- 1. Generate Generic PNG Sizes ---
$genDir = "$projectRoot\assets\generated_icons"
Resize-Image $sourcePath "$genDir\icon_48.png" 48 48
Resize-Image $sourcePath "$genDir\icon_72.png" 72 72
Resize-Image $sourcePath "$genDir\icon_96.png" 96 96
Resize-Image $sourcePath "$genDir\icon_144.png" 144 144
Resize-Image $sourcePath "$genDir\icon_192.png" 192 192
Resize-Image $sourcePath "$genDir\icon_512.png" 512 512
Resize-Image $sourcePath "$genDir\icon_1024.png" 1024 1024

# --- 2. Overwrite Android Mipmap Launcher Icons ---
$resDir = "$projectRoot\android\app\src\main\res"
Resize-Image $sourcePath "$resDir\mipmap-mdpi\ic_launcher.png" 48 48
Resize-Image $sourcePath "$resDir\mipmap-mdpi\ic_launcher_round.png" 48 48

Resize-Image $sourcePath "$resDir\mipmap-hdpi\ic_launcher.png" 72 72
Resize-Image $sourcePath "$resDir\mipmap-hdpi\ic_launcher_round.png" 72 72

Resize-Image $sourcePath "$resDir\mipmap-xhdpi\ic_launcher.png" 96 96
Resize-Image $sourcePath "$resDir\mipmap-xhdpi\ic_launcher_round.png" 96 96

Resize-Image $sourcePath "$resDir\mipmap-xxhdpi\ic_launcher.png" 144 144
Resize-Image $sourcePath "$resDir\mipmap-xxhdpi\ic_launcher_round.png" 144 144

Resize-Image $sourcePath "$resDir\mipmap-xxxhdpi\ic_launcher.png" 192 192
Resize-Image $sourcePath "$resDir\mipmap-xxxhdpi\ic_launcher_round.png" 192 192

# --- 3. Save Web and PWA Icons ---
$pubDir = "$projectRoot\public"
Resize-Image $sourcePath "$pubDir\favicon.png" 32 32
Resize-Image $sourcePath "$pubDir\icon-192.png" 192 192
Resize-Image $sourcePath "$pubDir\icon-512.png" 512 512

Write-Host "Success! All icons generated successfully."
