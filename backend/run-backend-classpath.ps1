$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$classPath = "$backendDir\target\classes;$backendDir\target\extracted\BOOT-INF\lib\*"
$env:DEBUG = "false"
java -cp $classPath com.creame.crime.CrimeReportingApplication
