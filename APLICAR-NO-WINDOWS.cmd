@echo off
setlocal DisableDelayedExpansion
echo Correcao do login PetHub
echo Cole a pasta principal do projeto, onde fica o package.json.
set "PETHUB_ALVO="
set /p PETHUB_ALVO=Projeto: 
set "PETHUB_ALVO=%PETHUB_ALVO:"=%"
node "%~dp0corrigir-login-granel.cjs" "%PETHUB_ALVO%"
echo.
pause
