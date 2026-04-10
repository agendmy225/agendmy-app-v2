$found = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts" | Where-Object {
    $content = [System.IO.File]::ReadAllText($_.FullName)
    $content -match "+|+|-|Ã"
}
if ($found) { $found | ForEach-Object { Write-Host $_.FullName } }
else { Write-Host "Nenhum arquivo com problema!" }
