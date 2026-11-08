# kakao-reply 설치 (윈도우). 사용: PowerShell 에서  powershell -ExecutionPolicy Bypass -File install.ps1
$ErrorActionPreference = "Stop"
if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
  Write-Error "Python 3.10 이상이 필요해요. python.org 에서 설치하고 'Add to PATH' 를 체크하세요."
}
py -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if ($LASTEXITCODE -ne 0) { Write-Error "Python 3.10 이상이 필요해요." }
py -m pip install --user --upgrade pipx
py -m pipx ensurepath
py -m pipx install --force "$PSScriptRoot"
Write-Host ""
Write-Host "설치했어요. PowerShell 을 새로 연 뒤 다음을 한 번씩 실행하세요:"
Write-Host "  kakao-reply key set"
Write-Host "  kakao-reply me 내이름"
