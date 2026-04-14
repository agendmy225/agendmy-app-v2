$files = Get-ChildItem -Path "src" -Recurse -Include "*.tsx","*.ts"
foreach ($file in $files) {
    $content = [System.IO.File]::ReadAllText($file.FullName, [System.Text.Encoding]::UTF8)
    $fixed = $content `
        -replace 'Não', 'N�o' `
        -replace 'ão', '�o' `
        -replace 'ç', '�' `
        -replace 'á', '�' `
        -replace 'é', '�' `
        -replace 'ê', '�' `
        -replace 'ó', '�' `
        -replace 'ú', '�' `
        -replace 'í', '�' `
        -replace '� ', '�' `
        -replace 'Â', '�' `
        -replace 'Ã', '�' `
        -replace '“', '"' `
        -replace '�', '"' `
        -replace 'Ç', '�' `
        -replace 'Õ', '�' `
        -replace 'õ', '�' `
        -replace 'É', '�' `
        -replace '�"', '�' `
        -replace 'À', '�' `
        -replace '�"', '�' `
        -replace 'ô', '�' `
        -replace 'È', '�' `
        -replace 'è', '�' `
        -replace 'Ë', '�' `
        -replace 'ë', '�' `
        -replace 'É', '�' `
        -replace '¢', '�' `
        -replace '�"', '�' `
        -replace '•', '�'
    [System.IO.File]::WriteAllText($file.FullName, $fixed, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Fixed: $($file.Name)"
}
