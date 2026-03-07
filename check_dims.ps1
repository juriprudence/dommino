Add-Type -AssemblyName System.Drawing
$files = @('public\challenge_invite.png', 'public\logo.png')
foreach ($file in $files) {
    if (Test-Path $file) {
        $img = [System.Drawing.Image]::FromFile($file)
        Write-Host "$($file): $($img.Width)x$($img.Height)"
        $img.Dispose()
    } else {
        Write-Host "$file not found"
    }
}
