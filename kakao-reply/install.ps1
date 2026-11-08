# kakao-reply 설치 (윈도우). 사용: PowerShell 에서  powershell -ExecutionPolicy Bypass -File install.ps1
$ErrorActionPreference = "Stop"
function Fail($msg) { Write-Host $msg -ForegroundColor Red; exit 1 }

if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
  Fail "Python 3.10 이상이 필요해요. python.org 에서 설치하고 'Add to PATH' 를 체크하세요."
}
py -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)"
if ($LASTEXITCODE -ne 0) { Fail "Python 3.10 이상이 필요해요." }

$cmd = "kakao-reply"
if (Get-Command pipx -ErrorAction SilentlyContinue) {
  pipx install --force "$PSScriptRoot"
  if ($LASTEXITCODE -ne 0) { Fail "pipx 로 설치하지 못했어요. 위 오류를 확인하세요." }
} else {
  py -m pip install --user --upgrade pipx
  if ($LASTEXITCODE -eq 0) {
    py -m pipx ensurepath
    py -m pipx install --force "$PSScriptRoot"
    if ($LASTEXITCODE -ne 0) { Fail "pipx 로 설치하지 못했어요. 위 오류를 확인하세요." }
  } else {
    # pipx 를 쓸 수 없으면 전용 가상환경에 설치하고, 실행 파일 전체 경로로 안내한다
    $venv = Join-Path $env:LOCALAPPDATA "kakao-reply\venv"
    py -m venv $venv
    if ($LASTEXITCODE -ne 0) { Fail "가상환경을 만들지 못했어요." }
    & (Join-Path $venv "Scripts\pip.exe") install "$PSScriptRoot"
    if ($LASTEXITCODE -ne 0) { Fail "가상환경에 설치하지 못했어요. 위 오류를 확인하세요." }
    $cmd = "& '" + (Join-Path $venv "Scripts\kakao-reply.exe") + "'"
  }
}
Write-Host ""
Write-Host "설치했어요. PowerShell 을 새로 연 뒤 다음을 한 번씩 실행하세요:"
Write-Host "  $cmd key set"
Write-Host "  $cmd me 내이름"
