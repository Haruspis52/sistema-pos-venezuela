Set WshShell = CreateObject("WScript.Shell")
' Ejecuta el servidor Node.js en segundo plano sin ventana de consola negra
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "cmd /c npm run dev", 0, False

' Espera 2 segundos y abre la aplicación en el navegador o modo PWA
WScript.Sleep 2500
WshShell.Run "http://localhost:3000", 1, False
