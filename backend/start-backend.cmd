@echo off
set "DIR=%~dp0"
set "CP=%DIR%target\classes;%DIR%target\extracted\BOOT-INF\lib\*"
set "DEBUG=false"
java -cp "%CP%" com.creame.crime.CrimeReportingApplication
