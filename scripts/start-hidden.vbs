Set objShell = CreateObject("WScript.Shell")
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
confluenceDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(scriptDir)
objShell.Run "cmd /c cd /d """ & confluenceDir & """ && node server.js >> scripts\confluence.log 2>&1", 0, False
