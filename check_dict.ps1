$f = Get-Content "src/assets/hspell_words.txt"
Write-Host "Total words: $($f.Count)"
Write-Host "First 10:"
$f[0..9]
Write-Host "File size: $((Get-Item 'src/assets/hspell_words.txt').Length) bytes"
